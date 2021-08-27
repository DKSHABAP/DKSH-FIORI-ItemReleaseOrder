sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"dksh/connectclient/itemblockorder/formatter/formatter",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, UIComponent, formatter, JSONModel, Filter, FilterOperator) {
	"use strict";

	return Controller.extend("dksh.connectclient.itemblockorder.controller.BaseController", {
		formatter: formatter,

		preSetModel: function (oView) {
			var oMockData = this.getOwnerComponent().getModel("MockData"),
				oDataValueHelpModel = this.getOwnerComponent().getModel("ValueHelp_SoldToParty");
			oView.setModel(oDataValueHelpModel);
			oView.setModel(new JSONModel(), "oUserDetailModel");
			oView.setModel(new JSONModel({
				panelSort: false,
				isPageBusy: false,
				selectedPage: 1,
				pagination: []
			}), "settings");
			oView.setModel(new JSONModel({
				"selectedSoldToParty": "",
				"selectedSalesDocNumInitial": "",
				"selectedSalesDocNumEnd": "",
				"selectedDistChannel": "",
				"selectedSalesDocDateFrom": null,
				"selectedSalesDocDateTo": null,
				"selectedMatGrp4": "",
				"selectedMatGrp": "",
				"selectedSalesOrg": "",
				"selectedDivision": "",
				"selectCustomerPo": "",
				"selectedDeliveryBlock": "",
				"selectedShipToParty": "",
				"selectedHeaderDeliveryBlock": "",
				"selectedMaterialNum": "",
				"isAdmin": false
			}), "filterModel");
			oView.setModel(oMockData, "MockData");
			oView.setModel(new JSONModel(), "LoadDataModel");
			oView.setModel(new JSONModel({
				"count": 0
			}), "ItemBlockModel");
			oView.setModel(new JSONModel(), "UserInfo");
			oView.setModel(new JSONModel(), "UserManagement");
			oView.setModel(new JSONModel(), "UserAccess");
		},
		getText: function (sText) {
			if (!sText) {
				return sText;
			}
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sText);
		},
		setBindingFilter: function (aFilterProperties, sFilterValue, oBinding) {
			var aFilters = [];

			for (var indx in aFilterProperties) {
				var sProperty = aFilterProperties[indx];
				if (typeof (oBinding.oList[0][sProperty]) === "string") {
					aFilters.push(new Filter(sProperty, FilterOperator.Contains, sFilterValue));
				} else {
					aFilters.push(new Filter(sProperty, FilterOperator.EQ, +sFilterValue));
				}
			}
			return aFilters;
		},
		setODataFilter: function (aProperties, oItemRow) {
			var aFilters = [];

			debugger;
			for (var indx in aProperties) {
				if (oItemRow[aProperties[indx]]) {
					aFilters.push(new Filter(aProperties[indx], FilterOperator.EQ, oItemRow[aProperties[indx]].toString()));
				}
			}
			return aFilters;
		},
		displayWarning: function () {},
		displayError: function () {}
	});
});