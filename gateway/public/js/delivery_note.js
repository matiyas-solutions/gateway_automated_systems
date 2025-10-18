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
            method: "gateway.api.get_batch_details",  // Replace with your actual method path
            args: { item_code: row.item },
            callback: function(r) {
                if (!r.message || r.message.length === 0) {
                    return;
                }

                let table_data = r.message
                    .filter(entry => entry.qty > 0)
                    .map(entry => ({
                        batch_no: entry.batch_no,
                        warehouse: entry.warehouse,
                        qty: entry.qty,
                        batch_item_code: frappe.utils.get_random(10)
                    }));

                if (table_data.length === 0) {
                    frappe.msgprint(__('No available stock found for this item.'));
                    return;
                }

                let d = new frappe.ui.Dialog({
                    title: __('Available Batches for {0}', [row.item]),
                    size: 'large',
                    fields: [
                        {
                            fieldname: 'batch_table',
                            fieldtype: 'Table',
                            label: 'Available Batches (Click rows to select)',
                            cannot_add_rows: true,
                            in_place_edit: false,
                            fields: [
                                { fieldname: 'batch_no', fieldtype: 'Data', label: 'Batch No', read_only: 1, in_list_view: 1 },
                                { fieldname: 'warehouse', fieldtype: 'Data', label: 'Warehouse', read_only: 1, in_list_view: 1 },
                                { fieldname: 'qty', fieldtype: 'Float', label: 'Available Qty', read_only: 1, in_list_view: 1 },
                                { fieldname: 'batch_item_code', fieldtype: 'Data', label: 'Batch Item Code', read_only: 1, hidden: 1 }
                            ],
                            data: table_data
                        }
                    ],
                    primary_action_label: __('Add Selected Batches'),
                    primary_action(values) {
                        let selected_indices = d.selected_rows || [];
                        let selected_batches = [];

                        if (selected_indices.length > 0) {
                            selected_batches = selected_indices.map(index => table_data[index]).filter(Boolean);
                        } else {
                            selected_batches = table_data || [];
                        }

                        if (selected_batches.length === 0) {
                            frappe.msgprint(__('Please click on rows to select batches first.'));
                            return;
                        }

                        let total_qty = selected_batches.reduce((sum, batch) => sum + (batch.qty || 0), 0);
                        let qty_in_rolls = selected_batches.length;
                        let batch_nos = selected_batches.map(batch => batch.batch_no).join('\n');
                        let warehouses = selected_batches.map(batch => batch.warehouse).join('\n');

                        // Unique link between this MBItem row and all items created from it
                        let batch_item_code = frappe.utils.get_random(10);
                        frappe.model.set_value(cdt, cdn, 'qty_in_kgs', total_qty);
                        frappe.model.set_value(cdt, cdn, 'qty_in_rolls', qty_in_rolls);
                        frappe.model.set_value(cdt, cdn, 'batches', batch_nos);
                        frappe.model.set_value(cdt, cdn, 'warehouse', warehouses);
                        frappe.model.set_value(cdt, cdn, 'batch_item_code', batch_item_code);  // Set unique code

                        frm.refresh_field('custom_multiple_batch_items');

                        selected_batches.forEach(r => {
                            let dn_child = frm.add_child('items');
                            frappe.model.set_value(dn_child.doctype, dn_child.name, 'item_code', row.item);
                            frappe.model.set_value(dn_child.doctype, dn_child.name, 'custom_batch_item_code', batch_item_code); // Link to batch item

                            setTimeout(() => {
                                if (r.warehouse) {
                                    frappe.model.set_value(dn_child.doctype, dn_child.name, 'warehouse', r.warehouse);
                                }
                                if (r.batch_no) {
                                    frappe.model.set_value(dn_child.doctype, dn_child.name, 'batch_no', r.batch_no);
                                }
                                if (r.qty) {
                                    frappe.model.set_value(dn_child.doctype, dn_child.name, 'qty', r.qty);
                                }
                            }, 300);
                        });

                        frm.refresh_field('items');
                        d.hide();
                    }
                });

                d.show();
                setTimeout(() => {
                    const tableElement = d.fields_dict.batch_table.$wrapper.find('.grid-body .rows');
                    d.selected_rows = [];

                    tableElement.on('click', '.grid-row', function () {
                        const rowIndex = $(this).index();
                        const isSelected = $(this).hasClass('row-selected');

                        if (isSelected) {
                            $(this).removeClass('row-selected');
                            d.selected_rows = d.selected_rows.filter(idx => idx !== rowIndex);
                        } else {
                            $(this).addClass('row-selected');
                            d.selected_rows.push(rowIndex);
                        }
                    });
                }, 100);
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