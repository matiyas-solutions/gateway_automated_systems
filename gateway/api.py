import frappe

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
        pluck="name"
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
        fields=["batch_no", "qty", "warehouse"]
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
def get_markup(sales_order, item_code, markp):
    """
    Fetch the average markup percentage from all submitted Purchase Receipts
    linked to the given Sales Order and Item.
    """

    if not sales_order or not item_code:
        return 0

    # Map markup labels to fieldnames
    markup_field_map = {
        "Retail Markup": "custom_retail_markup_",
        "Wholesale Markup": "custom_wholesale_markup_",
        "Distributor Markup": "custom_distributor_markup_",
        "Markup Price 3": "custom_markup_price_3",
        "Markup Price 4": "custom_markup_price_4"
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
