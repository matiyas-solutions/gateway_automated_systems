import frappe
from frappe.utils import flt

@frappe.whitelist()
def get_batch_details(item_code):
    results = []

    # Step 1: Get all parent docs of the given item with batch info
    parent_names = frappe.db.get_list(
        "Serial and Batch Bundle",
        filters={
            "item_code": item_code,
            "type_of_transaction": "Inward",
            "has_batch_no": 1
        },
        pluck="name",
        order_by="creation asc"
    )

    if not parent_names:
        return results

    # Step 2: Get all child entries with qty > 0
    child_entries = frappe.db.get_all(
        "Serial and Batch Entry",
        filters={
            "parent": ["in", parent_names],
            "qty": [">", 0]
        },
        fields=["batch_no", "qty", "warehouse", "creation"],
        order_by="creation asc"
    )

    # Step 3: Include only batches that exist and have batch_qty > 0
    for entry in child_entries:
        batch = frappe.db.get_value("Batch", entry.batch_no, ["batch_qty"], as_dict=True)
        if batch and batch.batch_qty > 0:
            results.append({
                "batch_no": entry.batch_no,
                "qty": entry.qty,
                "warehouse": entry.warehouse
            })

    return results

@frappe.whitelist()
def set_item_batch_details(item, selected_batches, doc):
    import json

    if isinstance(selected_batches, str):
        selected_batches = json.loads(selected_batches)
    if isinstance(doc, str):
        doc = json.loads(doc)

    # Prepare items list to return
    items = []

    for batch in selected_batches:
        items.append({
            "item_code": item or batch.get("item_code"),
            "batch_no": batch.get("batch_no"),
            "warehouse": batch.get("warehouse"),
            "qty": batch.get("qty")
        })

    # Return items list to be added client-side
    return {"items": items}


@frappe.whitelist()
def get_markup(sales_order, item_code, markp):
    """
    Fetch the average markup percentage from all submitted Purchase Receipts
    linked to the given Sales Order and Item.
    """

    if not sales_order or not item_code:
        return 0

    # Map markup labels to fieldnames
    markup_field_map = {
        "Retail Price": "custom_retail_price",
        "Wholesale Price": "custom_wholesale_price",
        "Market Square": "custom_market_square",
        "General Sales Price": "custom_general_sales_price",
    }

    fieldname = markup_field_map.get(markp)
    if not fieldname:
        return 0

    # Step 1: Get all Purchase Orders linked to this Sales Order & Item
    purchase_orders = frappe.db.get_all(
        "Purchase Order Item",
        filters={"sales_order": sales_order, "item_code": item_code},
        pluck="parent"  # directly get list of PO names
    )

    if not purchase_orders:
        return 0

    # Step 2: Fetch all relevant Purchase Receipts (submitted only)
    purchase_receipts = frappe.db.get_all(
        "Purchase Receipt Item",
        filters={"purchase_order": ["in", purchase_orders], "item_code": item_code},
        fields=["parent"]
    )

    if not purchase_receipts:
        return 0

    # Step 3: Fetch markup values directly using SQL for better performance
    receipt_names = [pr.parent for pr in purchase_receipts]

    markup_values = frappe.db.get_all(
        "Purchase Receipt",
        filters={"name": ["in", receipt_names], "docstatus": 1},
        pluck=fieldname
    )

    # Step 4: Calculate average of non-zero markups
    valid_values = [v for v in markup_values if v]

    if valid_values:
        avg_markup = sum(valid_values) / len(valid_values)
        return round(avg_markup, 2)

    return 0

@frappe.whitelist()
def update_price_list(doc, method):
    price_lists = [
        "Retail Markup",
        "Wholesale Markup",
        "Distributor Markup",
        "Markup Price 4",
        "Markup Price 3"
    ]

    for item in doc.items:
        base_rate = flt(item.rate)

        markup_rules = {
            "Retail Markup": doc.custom_retail_markup_,      
            "Wholesale Markup": doc.custom_wholesale_markup_,   
            "Distributor Markup": doc.custom_distributor_markup_,   
            "Markup Price 4": doc.custom_markup_price_4,      
            "Markup Price 3": doc.custom_markup_price_3       
        }

        for price_list in price_lists:
            new_rate = base_rate + (base_rate * markup_rules[price_list])
            if new_rate <= 0:
                continue

            existing_price = frappe.db.exists("Item Price", {
                "item_code": item.item_code,
                "price_list": price_list
            })

            if existing_price:
                frappe.db.set_value("Item Price", existing_price, "price_list_rate", new_rate)
            else:
                price_doc = frappe.get_doc({
                    "doctype": "Item Price",
                    "price_list": price_list,
                    "item_code": item.item_code,
                    "price_list_rate": new_rate,
                    "currency": doc.currency or "INR",
                    "selling": 1,
                    "buying": 1
                })
                price_doc.insert(ignore_permissions=True)
