class LinkSelectorOverride extends frappe.ui.form.LinkSelector {
    search() {
		var args = {
			txt: this.dialog.fields_dict.txt.get_value(),
			searchfield: "name",
			start: this.start,
			page_length: this.page_length,
		};
		var me = this;

		if (this.target.set_custom_query) {
			this.target.set_custom_query(args);
		}

		// load custom query from grid
		if (
			this.target.is_grid &&
			this.target.fieldinfo[this.fieldname] &&
			this.target.fieldinfo[this.fieldname].get_query
		) {
			$.extend(args, this.target.fieldinfo[this.fieldname].get_query(cur_frm.doc));
		}

		frappe.link_search(
			this.doctype,
			args,
			function (results) {
				var parent = me.dialog.fields_dict.results.$wrapper;
				if (args.start === 0) {
					parent.empty();
				}

				if (results.length) {
					for (const v of results) {
						var row = $(
							repl(
								'<div class="row link-select-row">\
						<div class="col-xs-4 ellipsis">\
							<b><a href="#">%(name)s</a></b></div>\
						<div class="col-xs-8">\
							<span class="text-muted">%(values)s</span></div>\
						</div>',
								{
									name: v[0],
									values: v.splice(1).join(", "),
								}
							)
						).appendTo(parent);

						row.find("a")
							.attr("data-value", v[0])
							.click(function () {
								var value = $(this).attr("data-value");
								if (me.target.is_grid) {
									// set in grid
									// call search after value is set to get latest filtered results
									me.set_in_grid(value).then(() => me.search());
								} else {
									if (me.target.doctype)
										me.target.parse_validate_and_set_in_model(value);
									else {
										me.target.set_input(value);
										me.target.$input.trigger("change");
									}
									me.dialog.hide();
								}
								return false;
							});
					}
				} else {
					$(
						'<p><br><span class="text-muted">' +
							__("No Results") +
							"</span>" +
							(frappe.model.can_create(me.doctype)
								? '<br><br><a class="new-doc btn btn-default btn-sm">' +
								  __("Create a new {0}", [__(me.doctype)]) +
								  "</a>"
								: "") +
							"</p>"
					)
						.appendTo(parent)
						.find(".new-doc")
						.click(function () {
							frappe.new_doc(me.doctype);
						});
				}

				var more_btn = me.dialog.fields_dict.more.$wrapper;
				if (results.length < me.page_length) {
					more_btn.hide();
				} else {
					more_btn.show();
				}
			},
			this.dialog.get_primary_btn()
		);
	}
    set_in_grid(value) {
		return new Promise((resolve) => {
			if (this.qty_fieldname) {
				frappe.prompt(
					{
						fieldname: "qty",
						fieldtype: "Float",
						label: "Qty",
						default: 1,
						reqd: 1,
					},
					(data) => {
						let rows = this.target.frm.doc[this.target.df.fieldname] || [];
						let updated = false;

						for (let d of rows) {
							if (d[this.fieldname] === value) {
								// ✅ Add new quantity to existing qty
								let new_qty = flt(d[this.qty_fieldname]) + flt(data.qty);
								frappe.model
									.set_value(d.doctype, d.name, this.qty_fieldname, new_qty)
									.then(() => {
										frappe.show_alert(
											__("Updated {0} Qty → {1}", [value, new_qty])
										);
										resolve();
									});
								updated = true;
								break;
							}
						}

						// ✅ If item not found, add a new row
						if (!updated) {
							let d = null;
							frappe.run_serially([
								() => (d = this.target.add_new_row()),
								() => frappe.timeout(0.1),
								() => {
									let args = {};
									args[this.fieldname] = value;
									args[this.qty_fieldname] = data.qty;
									return frappe.model.set_value(d.doctype, d.name, args);
								},
								() => frappe.show_alert(__("Added {0} ({1})", [value, data.qty])),
								() => resolve(),
							]);
						}
					},
					__("Set Quantity"),
					__("Set Quantity")
				);
			} else if (this.dynamic_link_field) {
				let d = this.target.add_new_row();
				frappe.model.set_value(
					d.doctype,
					d.name,
					this.dynamic_link_field,
					this.dynamic_link_reference
				);
				frappe.model.set_value(d.doctype, d.name, this.fieldname, value).then(() => {
					frappe.show_alert(__("{0} {1} added", [this.dynamic_link_reference, value]));
					resolve();
				});
			} else {
				let d = this.target.add_new_row();
				frappe.model.set_value(d.doctype, d.name, this.fieldname, value).then(() => {
					frappe.show_alert(__("{0} added", [value]));
					resolve();
				});
			}
		});
	}
}


frappe.ui.form.LinkSelector = LinkSelectorOverride