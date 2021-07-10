sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"dksh/connectclient/itemblockorder/model/models",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, Device, models, JSONModel) {
	"use strict";

	return UIComponent.extend("dksh.connectclient.itemblockorder.Component", {

		metadata: {
			manifest: "json"
		},

		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			/*			this.getModel("UserInfo").metadataLoaded();*/
			/*			this.getModel("UserInfo").dataLoaded().then(function (oRes) {
							var oUserInfoModel = this.getModel("UserInfo");
							this.getModel("UserManagement").loadData("/UserManagement/service/scim/Users/" + oUserInfoModel.getProperty("/name"), null, true)
								.then(function (oUserMgtRes) {}.bind(this));
						}.bind(this));*/
		}
	});
});