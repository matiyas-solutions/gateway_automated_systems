# Copyright (c) 2025
# License: GNU General Public License v3
import frappe
from frappe.utils import flt, getdate
from frappe import _dict
from erpnext.stock.report.stock_balance.stock_balance import execute as stock_balance_report

# ------------------- Main Report Execution ------------------- #
def execute(filters=None):
    if not filters:
        filters = {}

    columns = get_columns()
    data = get_data(filters)
    return columns, data


# ------------------- Report Columns ------------------- #
def get_columns():
    return [
        {"label": "ITEMS", "fieldname": "item", "fieldtype": "Data", "width": 380},
        {"label": "AMOUNT (LEVEL 1)", "fieldname": "level_1", "fieldtype": "Currency", "width": 180},
        {"label": "AMOUNT (LEVEL 2)", "fieldname": "level_2", "fieldtype": "Currency", "width": 180},
        {"label": "NOTES", "fieldname": "notes", "fieldtype": "Data", "width": 250},
    ]


# ------------------- Data Calculation ------------------- #
def get_data(filters):
    company = filters.get("company")
    from_date = getdate(filters.get("from_date"))
    to_date = getdate(filters.get("to_date"))

    # --- Fetch stock data from ERPNext Stock Balance report ---
    stock_filters = frappe._dict({
        "company": company,
        "from_date": from_date,
        "to_date": to_date,
        "include_uom": None,
        "show_stock_ageing_data": 0,
        "show_variant_attributes": 0
    })

    stock_columns, stock_data = stock_balance_report(stock_filters)

    # --- Material Cost Calculation ---
    raw_opening = get_stock_value(stock_data, "Raw Material", opening=True)
    raw_closing = get_stock_value(stock_data, "Raw Material")
    raw_purchases = get_purchases(company, from_date, to_date)
    materials_used = raw_opening + raw_purchases - raw_closing

    # --- Manufacturing Costs ---
    factory_labour = get_gl_total(company, "Factory Labor Cost", from_date, to_date)
    mfg_overhead = get_gl_total(company, "Manufacturing Overheads", from_date, to_date)

    company_abbr = frappe.db.get_value("Company", company, "abbr") or ""
    wip_warehouse_name = f"Work In Progress - {company_abbr}"

    wip_opening = get_stock_value(stock_data, wip_warehouse_name, opening=True, filter_by="warehouse")
    wip_closing = get_stock_value(stock_data, wip_warehouse_name, filter_by="warehouse")
    cost_goods_mfg = materials_used + factory_labour + mfg_overhead + wip_opening - wip_closing

    # --- Finished Goods and COGS ---
    finished_opening = get_stock_value(stock_data, "Finished Goods", opening=True)
    finished_closing = get_stock_value(stock_data, "Finished Goods")
    cogs = cost_goods_mfg + finished_opening - finished_closing

    # --- Income and Profit ---
    sales = get_gl_total(company, "Sales", from_date, to_date)
    gross_profit = sales - cogs

    selling_cost = get_gl_total(company, "Selling & Distribution Cost", from_date, to_date)
    finance_cost = get_gl_total(company, "Finance Cost", from_date, to_date)
    admin_cost = get_gl_total(company, "Administrative Expenses", from_date, to_date)
    total_operating_exp = selling_cost + finance_cost + admin_cost
    net_operating_income = gross_profit - total_operating_exp

    other_income = get_gl_total(company, "Other Income", from_date, to_date)
    other_exp = get_gl_total(company, "Other Expenses", from_date, to_date)
    income_tax = get_gl_total(company, "Income Tax", from_date, to_date)
    net_profit = net_operating_income + other_income - other_exp - income_tax

    # --- Prepare Data for Report ---
    data = [
        {"item": "RAW MATERIAL INVENTORY (OPENING)", "level_1": raw_opening, "level_2": 0},
        {"item": "RAW MATERIAL PURCHASES FOR THE PERIOD", "level_1": raw_purchases, "level_2": 0},
        {"item": "LESS: RAW MATERIAL INVENTORY (CLOSING)", "level_1": raw_closing, "level_2": 0},
        {"item": "MATERIALS USED", "level_1": 0, "level_2": materials_used},

        {"item": "ADD: MANUFACTURING OVERHEADS", "level_1": mfg_overhead, "level_2": 0},
        {"item": "ADD: FACTORY LABOR COST", "level_1": factory_labour, "level_2": 0},
        {"item": "WORK IN PROCESS (OPENING)", "level_1": wip_opening, "level_2": 0},
        {"item": "LESS: WORK IN PROCESS (CLOSING)", "level_1": wip_closing, "level_2": 0},
        {"item": "COST OF GOODS MANUFACTURED", "level_1": 0, "level_2": cost_goods_mfg},

        {"item": "FINISHED GOODS (OPENING)", "level_1": finished_opening, "level_2": finished_opening},
        {"item": "LESS: FINISHED GOODS (CLOSING)", "level_1": finished_closing, "level_2": 0},
        {"item": "COST OF GOODS SOLD", "level_1": 0, "level_2": cogs},

        {"item": "SALES FOR THE PERIOD", "level_1": sales, "level_2": 0},
        {"item": "GROSS PROFIT", "level_1": 0, "level_2": gross_profit},
        {"item": "SELLING & DISTRIBUTION COST", "level_1": selling_cost, "level_2": 0},
        {"item": "FINANCE COST", "level_1": finance_cost, "level_2": 0},
        {"item": "ADMINISTRATIVE EXPENSES", "level_1": admin_cost, "level_2": 0},
        {"item": "TOTAL OPERATING EXPENSES", "level_1": 0, "level_2": total_operating_exp},
        {"item": "NET OPERATING INCOME", "level_1": 0, "level_2": net_operating_income},
        {"item": "OTHER INCOME", "level_1": other_income, "level_2": 0},
        {"item": "OTHER EXPENSES", "level_1": other_exp, "level_2": 0},
        {"item": "INCOME TAX", "level_1": income_tax, "level_2": 0},
        {"item": "NET PROFIT / (LOSS)", "level_1": 0, "level_2": net_profit},
    ]

    return data


# ------------------- Utility Functions ------------------- #
def get_stock_value(stock_data, name, opening=False, filter_by="item_group"):
    """
    Get total stock value filtered by either 'item_group' or 'warehouse'.
    - filter_by: "item_group" or "warehouse"
    - opening=True → uses opening_val
    - opening=False → uses bal_val
    """
    total = 0
    for row in stock_data:
        if filter_by == "warehouse":
            if row.get("warehouse") and name.lower() in row.get("warehouse").lower():
                total += flt(row.get("opening_val") if opening else row.get("bal_val"))
        else:
            if row.get("item_group") == name:
                total += flt(row.get("opening_val") if opening else row.get("bal_val"))
    return total



def get_purchases(company, from_date, to_date):
    """Get total purchases for Raw Materials."""
    value = frappe.db.sql(
        """
        SELECT SUM(base_net_total)
        FROM `tabPurchase Invoice`
        WHERE company=%s AND posting_date BETWEEN %s AND %s AND docstatus=1
        """,
        (company, from_date, to_date),
    )[0][0] or 0
    return flt(value)


def get_gl_total(company, keyword, from_date, to_date):
    """Get total GL value for a keyword account."""
    value = frappe.db.sql(
        """
        SELECT SUM(debit - credit)
        FROM `tabGL Entry`
        WHERE company=%s AND posting_date BETWEEN %s AND %s AND account LIKE %s
        """,
        (company, from_date, to_date, f"%{keyword}%"),
    )[0][0] or 0
    return flt(value)

def get_gl_total1(company, keyword, from_date, to_date):
    """Get total GL value for a keyword account."""
    value = frappe.db.sql(
        """
        SELECT SUM(credit)
        FROM `tabGL Entry`
        WHERE company=%s AND posting_date BETWEEN %s AND %s AND account LIKE %s
        """,
        (company, from_date, to_date, f"%{keyword}%"),
    )[0][0] or 0
    return flt(value)

