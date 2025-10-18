# Copyright (c) 2025, Matiyas Solutions LLP and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import nowdate

def execute(filters=None):
    if not filters:
        filters = {}

    from_date = filters.get("from_date") or nowdate()
    columns = get_columns()
    data = []

    # Helper: 0 ya NULL → None
    def none_if_zero(value):
        return None if not value or float(value) == 0 else value

    # --- Fetch Sales Invoice data with items ---
    invoices = frappe.db.sql("""
        SELECT
            si.name AS sales_id,
            si.posting_date AS posting_date,
            si.rounded_total AS total_amount,
            sii.item_name AS item,
            sii.warehouse AS warehouse,
            sii.qty AS qty,
            sii.rate AS rate,
            sii.amount AS amount,
            sii.batch_no AS batch_no,
            sii.delivery_note AS delivery_note,
            dni.batch_no
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        JoIN `tabDelivery Note Item` dni ON dni.parent = sii.delivery_note and dni.item_code = sii.item_code and dni.qty = sii.qty
        WHERE si.docstatus = 1 AND si.posting_date = %s
        ORDER BY si.name, sii.idx
    """, (from_date,), as_dict=True)

    last_invoice = None

    for inv in invoices:
        if inv.sales_id != last_invoice:
            # Parent row → invoice
            data.append({
                "sales_id": inv.sales_id,
                "posting_date": inv.posting_date,
                "total_amount": none_if_zero(inv.total_amount),
                "item": None,
                "warehouse": None,
                "qty": None,
                "rate": None,
                "amount": None,
                "batch_no": None,
                "delivery_note": None,
                "delivery_note_item": None,
                "indent": 0.0
            })
            last_invoice = inv.sales_id

        # Child row → invoice item
        data.append({
            "sales_id": None,
            "posting_date": None,
            "total_amount": None,
            "item": inv.item,
            "warehouse": inv.warehouse,
            "qty": none_if_zero(inv.qty),
            "rate": none_if_zero(inv.rate),
            "amount": none_if_zero(inv.amount),
            "batch_no": inv.batch_no,
            "delivery_note": inv.delivery_note,
            "delivery_note_item": inv.delivery_note_item,
            "indent": 1.0
        })

    # --- Summary Cards ---
    total_credit = frappe.db.sql("""
        SELECT IFNULL(SUM(grand_total), 0)
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND is_pos = 0 AND posting_date = %s
    """, (from_date,))[0][0]

    total_cash = frappe.db.sql("""
        SELECT IFNULL(SUM(amount), 0)
        FROM `tabSales Invoice Payment`
        WHERE mode_of_payment = 'Cash'
        AND parent IN (
            SELECT name FROM `tabSales Invoice`
            WHERE docstatus = 1 AND posting_date = %s
        )
    """, (from_date,))[0][0]

    total_pos = frappe.db.sql("""
        SELECT IFNULL(SUM(amount), 0)
        FROM `tabSales Invoice Payment`
        WHERE mode_of_payment = 'POS'
        AND parent IN (
            SELECT name FROM `tabSales Invoice`
            WHERE docstatus = 1 AND posting_date = %s
        )
    """, (from_date,))[0][0]

    total_transfer = frappe.db.sql("""
        SELECT IFNULL(SUM(amount), 0)
        FROM `tabSales Invoice Payment`
        WHERE mode_of_payment IN ('Bank Transfer', 'Direct Transfer')
        AND parent IN (
            SELECT name FROM `tabSales Invoice`
            WHERE docstatus = 1 AND posting_date = %s
        )
    """, (from_date,))[0][0]

    return columns, data, None, None, get_report_summary(total_credit, total_cash, total_pos, total_transfer)


def get_columns():
    return [
        {"label": "Sales ID / Item", "fieldname": "sales_id", "fieldtype": "Data", "width": 220},
        {"label": "Date", "fieldname": "posting_date", "fieldtype": "Date", "width": 130},
        {"label": "Total Amount", "fieldname": "total_amount", "fieldtype": "Currency", "width": 150},
        {"label": "Item", "fieldname": "item", "fieldtype": "Data", "width": 200},
        {"label": "Warehouse", "fieldname": "warehouse", "fieldtype": "Link", "options": "Warehouse", "width": 180},
        {"label": "Qty", "fieldname": "qty", "fieldtype": "Float", "width": 110},
        {"label": "Rate", "fieldname": "rate", "fieldtype": "Currency", "width": 110},
        {"label": "Amount", "fieldname": "amount", "fieldtype": "Currency", "width": 110},
        {"label": "Batch No", "fieldname": "batch_no", "fieldtype": "Data", "width": 130},
        {"label": "Delivery Note", "fieldname": "delivery_note", "fieldtype": "Link", "options": "Delivery Note", "width": 150},
        {"label": "Delivery Note Item", "fieldname": "delivery_note_item", "fieldtype": "Data", "width": 150},
    ]


def get_report_summary(total_credit, total_cash, total_pos, total_transfer):
    def none_if_zero(value):
        return "" if not value or float(value) == 0 else value

    return [
        {"value": none_if_zero(total_credit), "indicator": "blue", "label": "Total Credit Sales", "datatype": "Currency"},
        {"value": none_if_zero(total_cash), "indicator": "green", "label": "Total Cash Sales", "datatype": "Currency"},
        {"value": none_if_zero(total_pos), "indicator": "purple", "label": "Total POS Sales", "datatype": "Currency"},
        {"value": none_if_zero(total_transfer), "indicator": "orange", "label": "Total Direct Transfer", "datatype": "Currency"},
    ]
