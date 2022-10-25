sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseObject, Filter, FilterOperator) {
	"use strict";

	return BaseObject.extend("dksh.connectclient.itemblockorder.controller.EditableConfig", {
		_oDataModel: null,
		_mapGivenWhenThen: [],
		/** 
		 * Prepare EditableConfig
		 * @param oDataModel oData V2 model with XSODATA datasource
		 */
		constructor: function (oDataModel) {
			this._oDataModel = oDataModel;
		},
		/** 
		 * Destroy EditableConfig
		 */
		destroy: function () {
			this._oDataModel = null;
			this._mapGivenWhenThen = null;
			BaseObject.prototype.destroy.apply(this, arguments);
		},
		/** 
		 * Get dkshcc/Setup.xsodata/Given
		 * @param oCombination Object with filter parameter values
		 */
		getGiven: function (oCombination) {
			var aFilters = [];
			if (!this._mapGivenWhenThen[oCombination]) {
				this._mapGivenWhenThen[oCombination] = new Promise(function (fnResolve) {
					if (oCombination.country) {
						aFilters.push(new Filter({
							path: "country",
							operator: FilterOperator.EQ,
							value1: oCombination.country
						}));
					}
					if (oCombination.module) {
						aFilters.push(new Filter({
							path: "module",
							operator: FilterOperator.EQ,
							value1: oCombination.module
						}));
					}
					if (oCombination.settingName) {
						aFilters.push(new Filter({
							path: "settingName",
							operator: FilterOperator.EQ,
							value1: oCombination.settingName
						}));
					}
					if (oCombination.grouping) {
						aFilters.push(new Filter({
							path: "grouping",
							operator: FilterOperator.EQ,
							value1: oCombination.grouping
						}));
					}
					this._oDataModel.metadataLoaded(true).then(
						function () {
							this._oDataModel.read("/Given", {
								urlParameters: {
									"$expand": "when,then"
								},
								filters: aFilters,
								success: function (oResponse) {
									fnResolve(oResponse.results);
								},
								error: function (oError) {
									fnResolve([]);
								}
							});
						}.bind(this),
						function () {
							fnResolve([]);
						});
				}.bind(this));
			}
			return this._mapGivenWhenThen[oCombination];
		},
		/** 
		 * Run Given/When/Then using a data context
		 * @param oContext Object with context data
		 * @returns Promise
		 */
		runGWT: function (aGiven, oContext) {
			aGiven.forEach(function (oGiven, iIndex) {
				var bWhen = oGiven.when.results.length === 0 || oGiven.when.results.every(function (oWhen) {
					if (oContext.hasOwnProperty(oWhen.name)) {
						return oContext[oWhen.name].toString() === oWhen.value.toString();
					} else {
						return false;
					}
				});
				if (bWhen) {
					oGiven.then.results.forEach(function (oThen) {
						if (oContext.hasOwnProperty(oThen.name)) {
							switch (oThen.active.toString()) {
							case "true":
							case "false":
								oContext[oThen.name] = oThen.active.toString() === "true" ? true : false;
								break;
							default:
								oContext[oThen.name] = oThen.value.toString();
							}
						}
					});
					return;
				}
			});
		}
	});
});