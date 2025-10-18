frappe.ui.form.on('Purchase Receipt Item', {
    custom_markup: function(frm, cdt, cdn) {
        markup_percent(frm, cdt, cdn);
    },
    qty: function(frm, cdt, cdn) {
        markup_percent(frm, cdt, cdn);
    },
});

frappe.ui.form.on('Purchase Receipt', {
    onload: function(frm) {
        frm.fields_dict['items'].grid.grid_pagination.page_length = 500; 
    }
});

function markup_percent(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.rate && row.custom_markup_perecent) {
        let new_rate = row.rate + (row.rate * row.custom_markup_perecent / 100);
        
        // frappe.model.set_value(cdt, cdn, 'rate', new_rate);
        setTimeout(() => {
            let new_amount = row.amount + new_rate
            frappe.model.set_value(cdt, cdn, 'rate', new_amount);
        }, 250);
    }
}
