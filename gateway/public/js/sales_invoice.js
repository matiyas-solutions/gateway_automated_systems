frappe.ui.form.on("Sales Invoice", {

    custom_get_batch_item: function(frm) {
        console.log("Custom Button Clicked");

        let d = new frappe.ui.Dialog({
            title: __('Select Batch Items'),
            fields: [
                {
                    fieldname: 'batch_items',
                    fieldtype: 'Table',
                    label: 'Batch Items',
                    in_place_edit: true,
                    cannot_add_rows: 0,
                    fields: [
                        {
                            fieldname: 'item_code',
                            fieldtype: 'Link',
                            options: 'Item',
                            label: 'Item Code',
                            in_list_view: 1,
                            reqd: 1
                        },
                        {
                            fieldname: 'warehouse',
                            fieldtype: 'Link',
                            options: 'Warehouse',
                            label: 'Warehouse',
                            in_list_view: 1,
                            reqd: 1
                        },
                        {
                            fieldname: 'batch_no',
                            fieldtype: 'Link',
                            options: 'Batch',
                            label: 'Batch No',
                            in_list_view: 1,
                            get_query: function(doc) {
                                if (doc.item_code && doc.warehouse) {
                                    return {
                                        query: "erpnext.controllers.queries.get_batch_no",
                                        filters: {
                                            item_code: doc.item_code,
                                            posting_date: frm.doc.posting_date || frappe.datetime.nowdate(),
                                            warehouse: doc.warehouse,
                                        }
                                    }
                                }
                            },
                            onchange: function() {
                                let row = this;
                                let grid_row = row.grid_row;
                                let batch_no = grid_row.doc.batch_no;

                                console.log('Batch onchange triggered:', batch_no);

                                if (!batch_no) return;

                                // Directly fetch qty from Batch doctype and set it in the same row
                                frappe.db.get_value('Batch', batch_no, 'batch_qty')
                                    .then(batch_data => {
                                        console.log('Batch doctype qty response:', batch_data);
                                        if (batch_data.message && batch_data.message.batch_qty !== undefined) {
                                            let qty = batch_data.message.batch_qty || 0;
                                            // Update the dialog table row doc and refresh the grid
                                            grid_row.doc.qty = qty;
                                            grid_row.refresh_field('qty');
                                            if (grid_row.grid && grid_row.grid.refresh) {
                                                grid_row.grid.refresh();
                                            }
                                        }
                                    })
                                    .catch(err => {
                                        console.log('Error fetching batch_qty:', err);
                                    });
                            }
                        },
                        {
                            fieldname: 'qty',
                            fieldtype: 'Float',
                            label: 'Qty',
                            read_only: 1,
                            in_list_view: 1
                        }
                    ]
                }
            ],
            primary_action_label: 'Add Item',
            primary_action(values) {
                try {
                    frm.doc.items = []
                    const rows = (values && values.batch_items) ? values.batch_items.filter(r => r && r.item_code) : [];
                    if (!rows.length) {
                        frappe.show_alert({ message: __('Please add at least one row'), indicator: 'orange' });
                        return;
                    }

                    // Group by item_code
                    const groupedByItem = {};
                    rows.forEach(r => {
                        const key = r.item_code;
                        if (!groupedByItem[key]) groupedByItem[key] = [];
                        groupedByItem[key].push(r);
                    });

                    // Create one consolidated row per item in custom_multiple_batch_items
                    Object.keys(groupedByItem).forEach(itemCode => {
                        const group = groupedByItem[itemCode];
                        const warehouses = Array.from(new Set(group.map(g => g.warehouse).filter(Boolean))).join('\n');
                        const batches = group.map(g => g.batch_no).filter(Boolean).join('\n');
                        const qtyInRolls = group.length;
                        const qtyInKgs = group.reduce((sum, g) => sum + (parseFloat(g.qty) || 0), 0);

                        let child = frm.add_child('custom_multiple_batch_items');
                        child.item = itemCode;
                        child.warehouse = warehouses;
                        child.qty_in_rolls = qtyInRolls;
                        child.qty_in_kgs = qtyInKgs;
                        child.batches = batches;
                    });

                    frm.refresh_field('custom_multiple_batch_items');

                    // Additionally, add one DN Item row per selected dialog row
                    rows.forEach(r => {
                        
                        let dn_child = frm.add_child('items');
                        frappe.model.set_value(dn_child.doctype, dn_child.name, 'item_code', r.item_code);
                        if (r.warehouse) {
                            frappe.model.set_value(dn_child.doctype, dn_child.name, 'warehouse', r.warehouse);
                        }
                        if (r.batch_no) {
                            frappe.model.set_value(dn_child.doctype, dn_child.name, 'batch_no', r.batch_no);
                        }
                        if (r.qty) {
                            frappe.model.set_value(dn_child.doctype, dn_child.name, 'qty', r.qty);
                        }
                    });

                    frm.refresh_field('items');
                    d.hide();
                } catch (e) {
                    console.error('Error in primary_action aggregation:', e);
                    frappe.msgprint(__('Something went wrong while adding rows. Check the console for details.'));
                }
            }
        });

        d.show();

        // Add event listener for batch_no field changes
        setTimeout(() => {
            // Method 1: Try change event
            d.fields_dict.batch_items.grid.wrapper.on('change', '[data-fieldname="batch_no"]', function() {
                let $input = $(this);
                let $row = $input.closest('.grid-row');
                let batch_no = $input.val();
                
                // Get values from grid data instead of DOM
                let row_index = $row.index();
                let grid_data = d.fields_dict.batch_items.grid.get_data();
                let row_data = grid_data[row_index];
                
                console.log('Method 1 - Change event:', {
                    batch_no: batch_no,
                    row_data: row_data,
                    grid_data: grid_data
                });
                
                if (batch_no && row_data && row_data.item_code && row_data.warehouse) {
                    fetchBatchQty(batch_no, row_data.item_code, row_data.warehouse, $row, row_data);
                }
            });

            // Method 2: Try focusout event as backup
            d.fields_dict.batch_items.grid.wrapper.on('focusout', '[data-fieldname="batch_no"]', function() {
                let $input = $(this);
                let $row = $input.closest('.grid-row');
                let batch_no = $input.val();
                
                let row_index = $row.index();
                let grid_data = d.fields_dict.batch_items.grid.get_data();
                let row_data = grid_data[row_index];
                
                console.log('Method 2 - Focusout event:', {
                    batch_no: batch_no,
                    row_data: row_data,
                    grid_data: grid_data
                });
                
                if (batch_no && row_data && row_data.item_code && row_data.warehouse) {
                    fetchBatchQty(batch_no, row_data.item_code, row_data.warehouse, $row, row_data);
                }
            });

            // Method 3: Monitor all input changes in the grid
            d.fields_dict.batch_items.grid.wrapper.on('input', 'input', function() {
                let $input = $(this);
                let fieldname = $input.attr('data-fieldname');
                
                if (fieldname === 'batch_no') {
                    let $row = $input.closest('.grid-row');
                    let batch_no = $input.val();
                    let row_index = $row.index();
                    
                    console.log('Batch input detected:', batch_no);
                    
                    // Use setTimeout to wait for other fields to update
                    setTimeout(() => {
                        let current_grid_data = d.fields_dict.batch_items.grid.get_data();
                        let current_row_data = current_grid_data[row_index];
                        
                        console.log('After delay - checking data:', {
                            batch_no: batch_no,
                            item_code: current_row_data?.item_code,
                            warehouse: current_row_data?.warehouse,
                            full_row: current_row_data
                        });
                        
                        if (batch_no && current_row_data && current_row_data.item_code && current_row_data.warehouse) {
                            fetchBatchQty(batch_no, current_row_data.item_code, current_row_data.warehouse, $row, current_row_data);
                        } else {
                            console.log('Missing required data:', {
                                has_batch: !!batch_no,
                                has_item: !!current_row_data?.item_code,
                                has_warehouse: !!current_row_data?.warehouse
                            });
                        }
                    }, 200);
                }
            });

            function fetchBatchQty(batch_no, item_code, warehouse, $row, row_data) {
                console.log('🔄 Fetching batch qty for:', {batch_no, item_code, warehouse});
                console.log('⏳ Starting ERPNext batch qty method...');
                
                // Try ERPNext's built-in batch query method first
                frappe.call({
                    method: 'erpnext.stock.get_item_details.get_batch_qty',
                    args: {
                        batch_no: batch_no,
                        warehouse: warehouse,
                        item_code: item_code
                    },
                    callback: function(r) {
                        console.log('✅ ERPNext batch qty response:', r);
                        if (r.message && r.message.batch_qty !== undefined) {
                            let qty = r.message.batch_qty || 0;
                            console.log('🎯 Found qty via ERPNext method:', qty);
                            $row.find('[data-fieldname="qty"] input').val(qty);
                            frappe.model.set_value(row_data.doctype, row_data.name, 'qty', qty);
                            d.fields_dict.batch_items.grid.refresh();
                            console.log('✨ Successfully updated qty to:', qty);
                        } else {
                            console.log('❌ ERPNext method returned no qty, trying fallback...');
                            fetchBatchQtyFallback(batch_no, item_code, warehouse, $row, row_data);
                        }
                    },
                    error: function(r) {
                        console.log('❌ ERPNext method error:', r);
                        fetchBatchQtyFallback(batch_no, item_code, warehouse, $row, row_data);
                    }
                });
            }

            function fetchBatchQtyFallback(batch_no, item_code, warehouse, $row, row_data) {
                console.log('🔄 Trying Stock Ledger Entry method...');
                
                frappe.call({
                    method: 'frappe.client.get_value',
                    args: {
                        doctype: 'Stock Ledger Entry',
                        filters: {
                            batch_no: batch_no,
                            warehouse: warehouse,
                            item_code: item_code
                        },
                        fieldname: 'qty_after_transaction',
                        order_by: 'posting_date desc, posting_time desc'
                    },
                    callback: function(stock_r) {
                        console.log('📊 Stock ledger response:', stock_r);
                        if (stock_r.message && stock_r.message.qty_after_transaction !== undefined) {
                            let qty = Math.abs(stock_r.message.qty_after_transaction);
                            console.log('🎯 Found qty via Stock Ledger:', qty);
                            $row.find('[data-fieldname="qty"] input').val(qty);
                            frappe.model.set_value(row_data.doctype, row_data.name, 'qty', qty);
                            d.fields_dict.batch_items.grid.refresh();
                            console.log('✨ Successfully updated qty from stock ledger to:', qty);
                        } else {
                            console.log('❌ Stock Ledger method failed, trying final fallback...');
                            fetchBatchQtyFinalFallback(batch_no, item_code, warehouse, $row, row_data);
                        }
                    },
                    error: function(r) {
                        console.log('❌ Stock Ledger method error:', r);
                        fetchBatchQtyFinalFallback(batch_no, item_code, warehouse, $row, row_data);
                    }
                });
            }

            function fetchBatchQtyFinalFallback(batch_no, item_code, warehouse, $row, row_data) {
                console.log('🔄 Trying Batch doctype method...');
                
                frappe.db.get_value('Batch', batch_no, 'batch_qty')
                    .then(batch_data => {
                        console.log('📦 Batch doctype response:', batch_data);
                        if (batch_data.message && batch_data.message.batch_qty !== undefined) {
                            let qty = batch_data.message.batch_qty;
                            console.log('🎯 Found qty via Batch doctype:', qty);
                            $row.find('[data-fieldname="qty"] input').val(qty);
                            frappe.model.set_value(row_data.doctype, row_data.name, 'qty', qty);
                            d.fields_dict.batch_items.grid.refresh();
                            console.log('✨ Successfully updated qty from batch to:', qty);
                        } else {
                            console.log('❌ No quantity found for batch:', batch_no, '- All methods failed');
                        }
                    })
                    .catch(error => {
                        console.log('❌ Batch doctype method error:', error);
                    });
            }
        }, 500);

    }
});


frappe.ui.form.on('Multiple Batch Item', {
    rate: function(frm, cdt, cdn) {
        multiply_rate_and_qtyinkgs(frm, cdt, cdn);
        update_delivery_note_item(frm);
    }

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