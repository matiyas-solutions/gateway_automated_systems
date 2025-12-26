import frappe
from frappe.utils import flt, cint

@frappe.whitelist()
def get_batch_details(item_code):
    """
    Get current available batch stock per warehouse
    using Serial and Batch Bundle (ERPNext v15+)
    """

    return frappe.db.sql("""
        SELECT
            sbi.batch_no,
            sle.warehouse,
            SUM(sbi.qty) AS qty
        FROM `tabStock Ledger Entry` sle
        INNER JOIN `tabSerial and Batch Bundle` sbb
            ON sbb.name = sle.serial_and_batch_bundle
        INNER JOIN `tabSerial and Batch Entry` sbi
            ON sbi.parent = sbb.name
        WHERE
            sle.item_code = %(item_code)s
            AND sle.is_cancelled = 0
            AND sbi.batch_no IS NOT NULL
        GROUP BY
            sbi.batch_no,
            sle.warehouse
        HAVING
            qty > 0
        ORDER BY
            sle.warehouse,
            sbi.batch_no
    """, {"item_code": item_code}, as_dict=True)

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
        "Retail Price",
        "Wholesale Price",
        "Market Square",
        "General Sales Price"
    ]

    for item in doc.items:
        base_rate = flt(item.rate)

        markup_rules = {
            "Retail Price": doc.custom_retail_price,
            "Wholesale Price": doc.custom_wholesale_price,
            "Market Square": doc.custom_market_square,
            "General Sales Price": doc.custom_general_sales_price,
        }

        float_precision = cint(frappe.db.get_single_value("System Settings", "float_precision") or 2)
        for price_list in price_lists:
            if frappe.db.exists("Price List",price_list):
                if item.conversion_factor:
                    new_rate = item.stock_uom_rate + ((item.stock_uom_rate * markup_rules[price_list]) / 100)
                else:
                    new_rate = base_rate + ((base_rate * markup_rules[price_list]) / 100)
                
                new_rate = round(new_rate, float_precision)
                    
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
                        "selling": 1
                    })
                    price_doc.insert(ignore_permissions=True)
