frappe.ui.form.on("Delivery Note", {
    setup: function(frm){
        if (frm.doc.items && frm.doc.items.length > 0) {
        // Check if NONE of the rows have an item_code
            const hasItemCode = frm.doc.items.some(row => row.item_code);

            if (!hasItemCode) {
                frm.clear_table('items');
                frm.refresh_field('items');  // Refresh to show cleared table
            }
        }
    },
    // custom_get_batch_item: function(frm) {
    //     let d = new frappe.ui.Dialog({
    //         title: __('Select Batch Items'),
    //         fields: [
    //             {
    //                 fieldname: 'batch_items',
    //                 fieldtype: 'Table',
    //                 label: 'Batch Items',
    //                 in_place_edit: true,
    //                 cannot_add_rows: 0,
    //                 fields: [
    //                     {
    //                         fieldname: 'item_code',
    //                         fieldtype: 'Link',
    //                         options: 'Item',
    //                         label: 'Item Code',
    //                         in_list_view: 1,
    //                         reqd: 1
    //                     },
    //                     {
    //                         fieldname: 'warehouse',
    //                         fieldtype: 'Link',
    //                         options: 'Warehouse',
    //                         label: 'Warehouse',
    //                         in_list_view: 1,
    //                         reqd: 1
    //                     },
    //                     {
    //                         fieldname: 'batch_no',
    //                         fieldtype: 'Link',
    //                         options: 'Batch',
    //                         label: 'Batch No',
    //                         in_list_view: 1,
    //                         get_query: function(doc) {
    //                             if (doc.item_code && doc.warehouse) {
    //                                 return {
    //                                     query: "erpnext.controllers.queries.get_batch_no",
    //                                     filters: {
    //                                         item_code: doc.item_code,
    //                                         posting_date: frm.doc.posting_date || frappe.datetime.nowdate(),
    //                                         warehouse: doc.warehouse,
    //                                     }
    //                                 }
    //                             }
    //                         },
    //                         onchange: function() {
    //                             let row = this;
    //                             let grid_row = row.grid_row;
    //                             let batch_no = grid_row.doc.batch_no;

    //                             if (!batch_no) return;

    //                             // Directly fetch qty from Batch doctype and set it in the same row
    //                             frappe.db.get_value('Batch', batch_no, 'batch_qty')
    //                                 .then(batch_data => {
    //                                     if (batch_data.message && batch_data.message.batch_qty !== undefined) {
    //                                         let qty = batch_data.message.batch_qty || 0;
    //                                         // Update the dialog table row doc and refresh the grid
    //                                         grid_row.doc.qty = qty;
    //                                         grid_row.refresh_field('qty');
    //                                         if (grid_row.grid && grid_row.grid.refresh) {
    //                                             grid_row.grid.refresh();
    //                                         }
    //                                     }
    //                                 })
    //                                 .catch(err => {
    //                                     console.log('Error fetching batch_qty:', err);
    //                                 });
    //                         }
    //                     },
    //                     {
    //                         fieldname: 'qty',
    //                         fieldtype: 'Float',
    //                         label: 'Qty',
    //                         read_only: 1,
    //                         in_list_view: 1
    //                     }
    //                 ]
    //             }
    //         ],
    //         primary_action_label: 'Add Item',
    //         primary_action(values) {
    //             try {
    //                 frm.doc.items = []
    //                 const rows = (values && values.batch_items) ? values.batch_items.filter(r => r && r.item_code) : [];
    //                 if (!rows.length) {
    //                     frappe.show_alert({ message: __('Please add at least one row'), indicator: 'orange' });
    //                     return;
    //                 }

    //                 // Group by item_code
    //                 const groupedByItem = {};
    //                 rows.forEach(r => {
    //                     const key = r.item_code;
    //                     if (!groupedByItem[key]) groupedByItem[key] = [];
    //                     groupedByItem[key].push(r);
    //                 });

    //                 Object.keys(groupedByItem).forEach(itemCode => {
    //                     const group = groupedByItem[itemCode];
    //                     const warehouses = Array.from(new Set(group.map(g => g.warehouse).filter(Boolean))).join('\n');
    //                     const batches = group.map(g => g.batch_no).filter(Boolean).join('\n');
    //                     const qtyInRolls = group.length;
    //                     const qtyInKgs = group.reduce((sum, g) => sum + (parseFloat(g.qty) || 0), 0);

    //                     let child = frm.add_child('custom_multiple_batch_items');
    //                     child.item = itemCode;
    //                     child.warehouse = warehouses;
    //                     child.qty_in_rolls = qtyInRolls;
    //                     child.qty_in_kgs = qtyInKgs;
    //                     child.batches = batches;
    //                 });

    //                 frm.refresh_field('custom_multiple_batch_items');

    //                 // Additionally, add one DN Item row per selected dialog row
    //                 rows.forEach(r => {
                        
    //                     let dn_child = frm.add_child('items');
    //                     frappe.model.set_value(dn_child.doctype, dn_child.name, 'item_code', r.item_code);
    //                     if (r.warehouse) {
    //                         frappe.model.set_value(dn_child.doctype, dn_child.name, 'warehouse', r.warehouse);
    //                     }
    //                     if (r.batch_no) {
    //                         frappe.model.set_value(dn_child.doctype, dn_child.name, 'batch_no', r.batch_no);
    //                     }
    //                     if (r.qty) {
    //                         frappe.model.set_value(dn_child.doctype, dn_child.name, 'qty', r.qty);
    //                     }
    //                 });

    //                 frm.refresh_field('items');
    //                 d.hide();
    //             } catch (e) {
    //                 console.error('Error in primary_action aggregation:', e);
    //                 frappe.msgprint(__('Something went wrong while adding rows. Check the console for details.'));
    //             }
    //         }
    //     });

    //     d.show();

    //     // Add event listener for batch_no field changes
    //     setTimeout(() => {
    //         // Method 1: Try change event
    //         d.fields_dict.batch_items.grid.wrapper.on('change', '[data-fieldname="batch_no"]', function() {
    //             let $input = $(this);
    //             let $row = $input.closest('.grid-row');
    //             let batch_no = $input.val();
                
    //             // Get values from grid data instead of DOM
    //             let row_index = $row.index();
    //             let grid_data = d.fields_dict.batch_items.grid.get_data();
    //             let row_data = grid_data[row_index];
                
    //             if (batch_no && row_data && row_data.item_code && row_data.warehouse) {
    //                 fetchBatchQty(batch_no, row_data.item_code, row_data.warehouse, $row, row_data);
    //             }
    //         });

    //         // Method 2: Try focusout event as backup
    //         d.fields_dict.batch_items.grid.wrapper.on('focusout', '[data-fieldname="batch_no"]', function() {
    //             let $input = $(this);
    //             let $row = $input.closest('.grid-row');
    //             let batch_no = $input.val();
                
    //             let row_index = $row.index();
    //             let grid_data = d.fields_dict.batch_items.grid.get_data();
    //             let row_data = grid_data[row_index];

                
    //             if (batch_no && row_data && row_data.item_code && row_data.warehouse) {
    //                 fetchBatchQty(batch_no, row_data.item_code, row_data.warehouse, $row, row_data);
    //             }
    //         });

    //         // Method 3: Monitor all input changes in the grid
    //         d.fields_dict.batch_items.grid.wrapper.on('input', 'input', function() {
    //             let $input = $(this);
    //             let fieldname = $input.attr('data-fieldname');
                
    //             if (fieldname === 'batch_no') {
    //                 let $row = $input.closest('.grid-row');
    //                 let batch_no = $input.val();
    //                 let row_index = $row.index();
                    
                    
    //                 // Use setTimeout to wait for other fields to update
    //                 setTimeout(() => {
    //                     let current_grid_data = d.fields_dict.batch_items.grid.get_data();
    //                     let current_row_data = current_grid_data[row_index];
                        
                        
    //                     if (batch_no && current_row_data && current_row_data.item_code && current_row_data.warehouse) {
    //                         fetchBatchQty(batch_no, current_row_data.item_code, current_row_data.warehouse, $row, current_row_data);
    //                     } else {
    //                         console.log('Missing required data:', {
    //                             has_batch: !!batch_no,
    //                             has_item: !!current_row_data?.item_code,
    //                             has_warehouse: !!current_row_data?.warehouse
    //                         });
    //                     }
    //                 }, 200);
    //             }
    //         });

    //         function fetchBatchQty(batch_no, item_code, warehouse, $row, row_data) {
    //             console.log('🔄 Fetching batch qty for:', {batch_no, item_code, warehouse});
    //             console.log('⏳ Starting ERPNext batch qty method...');
                
    //             // Try ERPNext's built-in batch query method first
    //             frappe.call({
    //                 method: 'erpnext.stock.get_item_details.get_batch_qty',
    //                 args: {
    //                     batch_no: batch_no,
    //                     warehouse: warehouse,
    //                     item_code: item_code
    //                 },
    //                 callback: function(r) {
    //                     console.log('✅ ERPNext batch qty response:', r);
    //                     if (r.message && r.message.batch_qty !== undefined) {
    //                         let qty = r.message.batch_qty || 0;
    //                         console.log('🎯 Found qty via ERPNext method:', qty);
    //                         $row.find('[data-fieldname="qty"] input').val(qty);
    //                         frappe.model.set_value(row_data.doctype, row_data.name, 'qty', qty);
    //                         d.fields_dict.batch_items.grid.refresh();
    //                         console.log('✨ Successfully updated qty to:', qty);
    //                     } else {
    //                         console.log('❌ ERPNext method returned no qty, trying fallback...');
    //                         fetchBatchQtyFallback(batch_no, item_code, warehouse, $row, row_data);
    //                     }
    //                 },
    //                 error: function(r) {
    //                     console.log('❌ ERPNext method error:', r);
    //                     fetchBatchQtyFallback(batch_no, item_code, warehouse, $row, row_data);
    //                 }
    //             });
    //         }

    //         function fetchBatchQtyFallback(batch_no, item_code, warehouse, $row, row_data) {
    //             console.log('🔄 Trying Stock Ledger Entry method...');
                
    //             frappe.call({
    //                 method: 'frappe.client.get_value',
    //                 args: {
    //                     doctype: 'Stock Ledger Entry',
    //                     filters: {
    //                         batch_no: batch_no,
    //                         warehouse: warehouse,
    //                         item_code: item_code
    //                     },
    //                     fieldname: 'qty_after_transaction',
    //                     order_by: 'posting_date desc, posting_time desc'
    //                 },
    //                 callback: function(stock_r) {
    //                     console.log('📊 Stock ledger response:', stock_r);
    //                     if (stock_r.message && stock_r.message.qty_after_transaction !== undefined) {
    //                         let qty = Math.abs(stock_r.message.qty_after_transaction);
    //                         console.log('🎯 Found qty via Stock Ledger:', qty);
    //                         $row.find('[data-fieldname="qty"] input').val(qty);
    //                         frappe.model.set_value(row_data.doctype, row_data.name, 'qty', qty);
    //                         d.fields_dict.batch_items.grid.refresh();
    //                         console.log('✨ Successfully updated qty from stock ledger to:', qty);
    //                     } else {
    //                         console.log('❌ Stock Ledger method failed, trying final fallback...');
    //                         fetchBatchQtyFinalFallback(batch_no, item_code, warehouse, $row, row_data);
    //                     }
    //                 },
    //                 error: function(r) {
    //                     console.log('❌ Stock Ledger method error:', r);
    //                     fetchBatchQtyFinalFallback(batch_no, item_code, warehouse, $row, row_data);
    //                 }
    //             });
    //         }

    //         function fetchBatchQtyFinalFallback(batch_no, item_code, warehouse, $row, row_data) {
    //             console.log('🔄 Trying Batch doctype method...');
                
    //             frappe.db.get_value('Batch', batch_no, 'batch_qty')
    //                 .then(batch_data => {
    //                     console.log('📦 Batch doctype response:', batch_data);
    //                     if (batch_data.message && batch_data.message.batch_qty !== undefined) {
    //                         let qty = batch_data.message.batch_qty;
    //                         console.log('🎯 Found qty via Batch doctype:', qty);
    //                         $row.find('[data-fieldname="qty"] input').val(qty);
    //                         frappe.model.set_value(row_data.doctype, row_data.name, 'qty', qty);
    //                         d.fields_dict.batch_items.grid.refresh();
    //                         console.log('✨ Successfully updated qty from batch to:', qty);
    //                     } else {
    //                         console.log('❌ No quantity found for batch:', batch_no, '- All methods failed');
    //                     }
    //                 })
    //                 .catch(error => {
    //                     console.log('❌ Batch doctype method error:', error);
    //                 });
    //         }
    //     }, 500);

    // },
    after_save: function(frm) {
        frm.refresh_field('items');
    }
   
});
frappe.ui.form.on("Delivery Note Item", {
    custom_markup_selling_: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item_code || !row.against_sales_order || !row.custom_markup_selling_) {
            frappe.msgprint("Please select Item, Sales Order, and Markup Type first.");
            return;
        }

        frappe.call({
            method: "gateway.api.get_markup",
            args: { 
                sales_order: row.against_sales_order,
                item_code: row.item_code,
                markp: row.custom_markup_selling_
            },
            callback: function(r) {
                console.log(r)
                if (r.message) {
                    let markup_percent = flt(r.message);
                    let base_rate = flt(row.rate);

                    let new_rate = base_rate + (base_rate * markup_percent / 100);
                    frappe.model.set_value(cdt, cdn, "rate", new_rate);

                    frappe.show_alert({
                        message: __("Rate updated using average {0}% {1}", [markup_percent, row.custom_markup_selling_]),
                        indicator: "green"
                    });
                }
            }
        });
    }
});

frappe.ui.form.on('Multiple Batch Item', {
    item: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (!row.item) {
            frappe.msgprint(__('Please select an item first.'));
            return;
        }

        if (!frm.doc.customer) {
            frappe.msgprint(__('Please select a Customer first.'));
            return;
        }

        frappe.call({
            method: "gateway.api.get_batch_details",
            args: { item_code: row.item },
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
                    title: __('Available Batches for {0}', [row.item]),
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
                                name: row.item
                            },
                            callback: function(r) {
                                let item_doc = r.message;

                                selected_batches.forEach(b => {
                                    let child = frappe.model.add_child(frm.doc, "items");
                                    child.item_code = row.item;
                                    child.qty = b.qty;
                                    child.batch_no = b.batch_no;
                                    child.warehouse = b.warehouse;
                                    child.item_name = item_doc.item_name;
                                    child.uom = item_doc.stock_uom;
                                    child.stock_uom = item_doc.stock_uom;
                                    child.conversion_factor = 1;
                                });

                                frm.refresh_field("items");
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

                    // Build filtered view from master_table_data
                    let filtered = master_table_data
                        .filter(m => {
                            const matchSearch =
                                !search ||
                                (m.batch_no || '').toLowerCase().includes(search) ||
                                String(m.qty || '').includes(search);

                            const matchWarehouse =
                                wh === 'All' || m.warehouse === wh;

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


                // add / remove visual highlight on currently rendered grid rows
                function restore_row_highlights() {
                    // iterate visible .grid-row elements
                    d.$wrapper.find('.grid-row').each(function () {
                        const $gr = $(this);
                        const idx = parseInt($gr.attr('data-idx'));
                        // grid.data is 0-based and corresponds to currently shown rows
                        const shown_row = d.fields_dict.batch_table.grid.data[idx - 1];
                        if (!shown_row) return;

                        const master = findMasterByName(shown_row.name);
                        if (master && master.selected) {
                            $gr.addClass('my-selected-row');
                        } else {
                            $gr.removeClass('my-selected-row');
                        }
                    });
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
    },

    rate: function(frm, cdt, cdn) {
        multiply_rate_and_qtyinkgs(frm, cdt, cdn);
        update_delivery_note_item(frm);
    },
    // qty_in_kgs: function(frm, cdt, cdn) {
    //     update_delivery_note_item(frm);
    // }
});



function multiply_rate_and_qtyinkgs(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.rate && row.qty_in_kgs) {
        let amount = flt(row.rate) * flt(row.qty_in_kgs);
        frappe.model.set_value(cdt, cdn, 'amount', amount);
        frm.refresh_field('custom_multiple_batch_items');
    }
}

function update_delivery_note_item(frm) {
    let item_summary = {};

    // Summarize by item_code
    (frm.doc.custom_multiple_batch_items || []).forEach(row => {
        if (!item_summary[row.item]) {
            item_summary[row.item] = { total_qty: 0, total_amount: 0 };
        }
        item_summary[row.item].total_qty += flt(row.qty_in_kgs);
        item_summary[row.item].total_amount += flt(row.amount);
    });

    // Update Delivery Note Items
    (frm.doc.items || []).forEach(item => {
        if (item_summary[item.item_code]) {
            let data = item_summary[item.item_code];
            let new_rate = data.total_amount / data.total_qty;
            frappe.model.set_value(item.doctype, item.name, 'rate', new_rate);
            frappe.model.set_value(item.doctype, item.name, 'amount', data.total_amount);

        }
    });

    frm.refresh_field('items');
}