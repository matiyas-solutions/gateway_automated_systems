frappe.ui.form.on("Stock Entry", {
    stock_entry_type(frm) {
        if (
            frm.doc.stock_entry_type === "Material Transfer" &&
            frm.doc.items &&
            frm.doc.items.length > 0
        ) {
            const hasItemCode = frm.doc.items.some(r => r.item_code);
            if (!hasItemCode) {
                frm.clear_table("items");
                frm.refresh_field("items");
            }
        }
    },
    after_save: function(frm) { 
        frm.refresh_field('items'); 
    }
});

frappe.ui.form.on("Select Multiple Batch", {
    item_code(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item_code) {
            frappe.msgprint(__("Please select an item first."));
            return;
        }

        frappe.call({
            method: "gateway.api.get_batch_details",
            args: { item_code: row.item_code },
            callback: function(r) {

                if (!r.message || r.message.length === 0) return;

                // master dataset that lives independently of the grid view
                let master_table_data = r.message
                    .filter(entry => entry.qty > 0)
                    .map(entry => ({
                        name: frappe.utils.get_random(8),
                        batch_no: entry.batch_no,
                        warehouse: entry.warehouse,
                        qty: entry.qty,
                        // selected flag lives in master
                        selected: false
                    }));

                if (master_table_data.length === 0) {
                    frappe.msgprint(__('No available stock found for this item.'));
                    return;
                }

                // inject small CSS to show highlight for selected rows
                const styleId = 'selected-row-style';
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.innerHTML = `
                        .my-selected-row { background: rgba(100, 180, 255, 0.12) !important; }
                        .my-selected-row .grid-row-data { font-weight: 600; }
                    `;
                    document.head.appendChild(style);
                }

                let d = new frappe.ui.Dialog({
                    title: __('Available Batches for {0}', [row.item_code]),
                    size: 'large',
                    fields: [
                        {
                            fieldname: 'search_batch',
                            fieldtype: 'Data',
                            label: 'Search Batch / Qty',
                            onchange: function () {
                                apply_filters();
                            }
                        },
                        { fieldname: 'column_break', fieldtype: "Column Break" },
                        {
                            fieldname: 'filter_warehouse',
                            fieldtype: 'Select',
                            label: 'Filter by Warehouse',
                            options: ['All'].concat([...new Set(master_table_data.map(r => r.warehouse))]),
                            default: 'All',
                            onchange: function () {
                                apply_filters();
                            }
                        },
                        { fieldname: 'section_break', fieldtype: "Section Break" },
                        {
                            fieldname: "t_warehouse",
                            label: "Target Warehouse",
                            fieldtype: "Link",
                            options: "Warehouse",
                            reqd: 1,
                            onchange() {
                                apply_filters();
                            }
                        },
                        {
                            fieldname: 'batch_table',
                            fieldtype: 'Table',
                            label: 'Available Batches (Click rows to select)',
                            cannot_add_rows: true,
                            in_place_edit: false,
                            fields: [
                                { fieldname: 'batch_no', fieldtype: 'Data', label: 'Batch No', read_only: 1, in_list_view: 1 },
                                { fieldname: 'warehouse', fieldtype: 'Data', label: 'Warehouse', read_only: 1, in_list_view: 1 },
                                { fieldname: 'qty', fieldtype: 'Float', label: 'Qty (KGs)', in_list_view: 1 }
                            ],
                            data: [] // populated by apply_filters()
                        }
                    ],
                    primary_action_label: __('Add Selected Batches'),
                    primary_action(values) {
                        // collect selected master rows
                        let selected_batches = master_table_data.filter(m => m.selected);

                        if (selected_batches.length === 0) {
                            frappe.msgprint(__('Please select batches first.'));
                            return;
                        }

                        // Calculate totals
                        let total_qty = selected_batches.reduce((sum, b) => sum + (parseFloat(b.qty) || 0), 0);
                        let qty_in_rolls = selected_batches.length;
                        let batch_nos = selected_batches.map(b => b.batch_no).join('\n');
                        let warehouses = [...new Set(selected_batches.map(b => b.warehouse))].join('\n');

                        frappe.model.set_value(cdt, cdn, 'qty_in_kgs', total_qty);
                        frappe.model.set_value(cdt, cdn, 'qty_in_rolls', qty_in_rolls);
                        frappe.model.set_value(cdt, cdn, 'batches', batch_nos);
                        frappe.model.set_value(cdt, cdn, 'warehouse', warehouses);

                        // Add into child table
                        frappe.call({
                            method: "frappe.client.get",
                            args: {
                                doctype: "Item",
                                name: row.item_code
                            },
                            callback(res) {
                                let item = res.message;

                                selected.forEach(b => {
                                    let child = frappe.model.add_child(frm.doc, "items");
                                    child.item_code = row.item_code;
                                    child.batch_no = b.batch_no;

                                    child.s_warehouse = b.warehouse;
                                    child.t_warehouse = values.t_warehouse;

                                    child.qty = b.qty;
                                    child.transfer_qty = b.qty;
                                    child.conversion_factor = 1;

                                    child.item_name = item.item_name;
                                    child.uom = item.stock_uom;
                                    child.stock_uom = item.stock_uom;
                                });

                                frm.refresh_field("items");
                                d.hide();
                            }
                        });

                        d.hide();
                    }
                });

                // keep track of selected names (keyed by unique name)
                d.selected_names = {}; // { name: true }

                // helper to find master row by name
                function findMasterByName(name) {
                    for (let i = 0; i < master_table_data.length; i++) {
                        if (master_table_data[i].name === name) return master_table_data[i];
                    }
                    return null;
                }

                // render filtered grid from master_table_data
                function apply_filters() {
                    const search = (d.get_value('search_batch') || '').toLowerCase();
                    const wh = d.get_value('filter_warehouse');
                    const t_wh = d.get_value('t_warehouse');

                    // Build filtered view from master_table_data
                    let filtered = master_table_data
                        .filter(m => {
                            const matchSearch =
                                !search ||
                                (m.batch_no || '').toLowerCase().includes(search) ||
                                String(m.qty || '').includes(search);

                            const matchWarehouse =
                                (wh === 'All' || m.warehouse === wh) && (m.warehouse !== t_wh);

                            return matchSearch && matchWarehouse;
                        })
                        .map(m => {
                            return {
                                name: m.name,
                                batch_no: m.batch_no,
                                warehouse: m.warehouse,
                                qty: m.qty,
                                
                                __checked: m.selected ? 1 : 0
                            };
                        });

                    d.fields_dict.batch_table.grid.df.data = filtered;
                    d.fields_dict.batch_table.grid.refresh();

                    // Re-apply highlight on rendered rows
                    setTimeout(() => {
                        d.$wrapper.find('.grid-row').each(function () {
                            const idx = parseInt($(this).attr('data-idx'));
                            const shown_row = d.fields_dict.batch_table.grid.data[idx - 1];

                            if (!shown_row) return;

                            const master = master_table_data.find(m => m.name === shown_row.name);

                            if (master && master.selected) {
                                $(this).addClass('my-selected-row');
                            } else {
                                $(this).removeClass('my-selected-row');
                            }
                        });
                    }, 30);
                }

                // Unbind previous handlers to avoid duplicates if dialog is re-opened
                d.$wrapper.off('click', '.grid-row');

                // row click toggles selection in master_table_data (no extra checkbox)
                d.$wrapper.on('click', '.grid-row', function (e) {
                    // prevent toggling when clicking on some internal input if any
                    // but allow general row clicks
                    let $gr = $(this);
                    const idx = parseInt($gr.attr('data-idx'));
                    const shown_row = d.fields_dict.batch_table.grid.data[idx - 1];
                    if (!shown_row) return;

                    let master = findMasterByName(shown_row.name);
                    if (!master) return;

                    // toggle
                    master.selected = !master.selected;

                    // reflect immediate highlight change on this DOM row
                    if (master.selected) {
                        $gr.addClass('my-selected-row');
                    } else {
                        $gr.removeClass('my-selected-row');
                    }

                    // keep selected_names for debugging / quick access
                    if (master.selected) {
                        d.selected_names[master.name] = true;
                    } else {
                        delete d.selected_names[master.name];
                    }
                });

                // initial render
                apply_filters();

                d.show();
            }
        });
    }
});
