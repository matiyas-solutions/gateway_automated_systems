// Copyright (c) 2025, Matiyas Solutions LLP and contributors
// For license information, please see license.txt

frappe.query_reports["Daily Sales"] = {
	filters: [
        {
            fieldname: "from_date",
            label: __("Date"),
            fieldtype: "Date",
            reqd: 1,
            default: frappe.datetime.get_today()
        }
    ],

    onload: function(report) {
        report.page.set_title("📊 Daily Reports Dashboard");
    }
};
