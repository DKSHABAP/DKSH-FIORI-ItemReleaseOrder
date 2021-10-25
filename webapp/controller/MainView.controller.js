sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, Fragment, Sorter, Filter, FilterOperator, MessageBox, MessageToast) {
	"use strict";
	var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";

	return BaseController.extend("dksh.connectclient.itemblockorder.controller.MainView", {
		onInit: function () {
			// Pre Set Model (Base Controller)
			this.preSetModel(this.getView());
			this.oFragmentList = [];

			this.getView().setBusy(true);
			Promise.all([this.formatter.fetchUserInfo.call(this)]).then(function (oRes) {
				this.formatter.fetchSaleOrder.call(this);
			}.bind(this)).catch(this._displayError.bind(this));
			//STRY0012026 Start Item Personalization settings for application users - Release Item
		    this.getUserDetails();
			//STRY0012026 End Item Personalization settings for application users - Release Item


		},
		// Method to initialize Item Personalization
/*		initializeItemPersonalization: function () {
			var that = this;
			var ListPersonalizationModel = new sap.ui.model.json.JSONModel();
			that.getView().setModel(ListPersonalizationModel, "ListPersonalizationModel");
			if (!this.ItemPresonalizationFrag) {
				//this.ItemPresonalizationFrag = sap.ui.xmlfragment("com.dkhs.view.Fragments.ItemPersonalization", this);
				this.ItemPresonalizationFrag = sap.ui.xmlfragment("dksh.connectclient.itemblockorder.view.Fragments.ItemPersonalization", this);
				this.getView().addDependent(this.ItemPresonalizationFrag);
				this.ItemPresonalizationFrag.addStyleClass("sapUiSizeCompact");
				that.ItemPresonalizationFrag.setModel(new sap.ui.model.json.JSONModel(), "oItemLevelPersonalizationModel");
			}
			var busyDialog = new sap.m.BusyDialog();
			busyDialog.open();
			this.oItemLevelPersonalizationModel = new sap.ui.model.json.JSONModel();
			this.getUserDetails();
			var screen = "Web";
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var payload = {
				"userId": this.getView().getModel("userapi").getProperty("/name"),
				"appId": "keySearchReleaseBlock",
				"runType": screen,
				"emailId": this.getView().getModel("userapi").getData().email
			};
		
			this.oItemLevelPersonalizationModel.loadData("/DKSHJavaService2/variant/getVariantReleaseOrder", JSON.stringify(payload), true, "POST", false, false, oHeader);
			this.oItemLevelPersonalizationModel.attachRequestCompleted(function (oEvent) {
				busyDialog.close();
				var itemLevelPersData = oEvent.getSource().getData().data;
				if (!itemLevelPersData) {
					return;
				}
				var customItem = {
					"header": [],
					"item": []
				};
				// loop to Segregate Header and item settings for personalization
				for (var i = 0; i < itemLevelPersData.length; i++) {
				/*	if (itemLevelPersData[i].level === "HEADER")
					{
						customItem.header.push(JSON.parse(JSON.stringify(itemLevelPersData[i])));
					} else {
						customItem.item.push(JSON.parse(JSON.stringify(itemLevelPersData[i])));
					}*/
				/*	customItem.header.push(JSON.parse(JSON.stringify(itemLevelPersData[i])));
					customItem.item.push(JSON.parse(JSON.stringify(itemLevelPersData[i])));
					
				}
				that.ItemPresonalizationFrag.getModel("oItemLevelPersonalizationModel").setData(customItem);
				that.ItemPresonalizationFrag.getModel("oItemLevelPersonalizationModel").refresh();
			});
			this.oItemLevelPersonalizationModel.attachRequestFailed(function (oEvent) {
				// MessageBox.error(oEvent.getSource().getData().message);
				busyDialog.close();
			});
		},*/

		onExpand: function (oEvent) {},
		onSortPress: function (oEvent, sId, sPath, sField) {
			var oView = this.getView(),
				oList = oView.byId(sId),
				oBinding = oList.getBinding("items"),
				settingModel = oView.getModel("settings"),
				aSorter = [],
				bDesc = !settingModel.getProperty(sPath);

			settingModel.setProperty(sPath, !settingModel.getProperty(sPath));
			aSorter.push(new Sorter(sField, bDesc, false));
			oBinding.sort(aSorter);
		},
		onDetailTableSortPress: function (oEvent, sField) {
			var sIcon = oEvent.getSource().getProperty("icon"),
				oBinding = oEvent.getSource().getParent().getParent().getParent().getBinding("items"),
				aSorters = [];

			if (sIcon === "sap-icon://drill-down") {
				oEvent.getSource().setProperty("icon", "sap-icon://drill-up");
				aSorters.push(new Sorter(sField, true, false));
			} else {
				oEvent.getSource().setProperty("icon", "sap-icon://drill-down");
				aSorters.push(new Sorter(sField, false, false));
			}
			oBinding.sort(aSorters);
		},
		onExpandAll: function (oEvent) {
			var oItemBlockModel = this.getView().getModel("ItemBlockModel"),
				oData = oItemBlockModel.getProperty("/data");
			for (var index in oData) {
				oData[index].expanded = true;
			}
			oItemBlockModel.refresh();
		},
		onCollapseAll: function (oEvent) {
			var oItemBlockModel = this.getView().getModel("ItemBlockModel"),
				oData = oItemBlockModel.getProperty("/data");
			for (var index in oData) {
				oData[index].expanded = false;
			}
			oItemBlockModel.refresh();
		},
		onResetValueHelp: function (oEvent) {
			var oFilterModel = this.getView().getModel("filterModel");
			this.resetModel(oFilterModel, Object.keys(this.getView().getModel("filterModel").getData()));
		},
		
		getUserDetails: function () {
			var that = this;
			$.ajax({
				type: "GET",
				async: false,
				url: "/services/userapi/currentUser",
				contentType: "application/scim+json",
				success: function (data, textStatus, xhr) {
					var userModel = new sap.ui.model.json.JSONModel(data);
					that.getView().setModel(userModel, "userapi");
					var PersonalizationModel = new sap.ui.model.json.JSONModel();
					that.getView().setModel(PersonalizationModel, "PersonalizationModel");
					that._getFilterPersonalizationDetails();
				   var ListPersonalizationModel = new sap.ui.model.json.JSONModel();
					that.getView().setModel(ListPersonalizationModel, "ListPersonalizationModel");
					that._getItemPersonalizationDetails();
					
				},
				error: function (data) {
					sap.m.MessageBox.error(that.getView().getModel("i18n").getProperty("retrieveDetails"));
				}
			});
		},	
		//Personalization for Search Filter
		onPressFilterPersonalization: function (oEvent) {
		//STRY0012026 Personalization settings for application users - Release Item
		    var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			that.getView().setModel(oModel, "oModel");
			this.selectedObjects = [];
			var PersonalizationModel = new sap.ui.model.json.JSONModel();
			if (!this.FilterPersonalization) 
			{
				this.FilterPersonalization = sap.ui.xmlfragment("dksh.connectclient.itemblockorder.view.Fragments.Personalization", this);
				this.getView().addDependent(this.FilterPersonalization);
			}
			that.getView().setModel(PersonalizationModel, "PersonalizationModel");
		//	this.getUserDetails();
			var screen = "Web";
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var payload = {
				"userId": this.getView().getModel("userapi").getProperty("/name"),
		
				//	var pID = this.getView().getModel("oUserModel").getData().
				"appId": "keySearchReleaseBlock",
				"runType": screen,
				"emailId": this.getView().getModel("userapi").getData().email
			};
			oModel.loadData("/DKSHJavaService2/variant/getVariant", JSON.stringify(payload), true, "POST", false, false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				if (success.getSource().getData().userPersonaDto !== null) {
					that.getView().getModel("PersonalizationModel").setProperty("/personalizationFilterBlockData", success.getSource().getData());
					var FilterPersonalization = new sap.ui.model.json.JSONModel({});
					FilterPersonalization.setData({
						"enableCheckBox": false,
						"selectVarVisible": true,
						"nameVarVisible": false,
						"okPersBtnVisible": true,
						"savePersBtnVisible": false,
						"cancelPersBtnVisible": true,
						"deletePersBtnVisible": false,
						"createPersBtnVisible": true,
						"varinatNameValueState": "None",
						"editPersBtnVisible": true,
						"results": success.getSource().getData()
					});
					if (that.FilterPersonalization) {
						that.FilterPersonalization.setModel(FilterPersonalization, "FilterPersonalization");
						that.FilterPersonalization.getModel("FilterPersonalization").refresh();
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/results/action", "");
					 
					}
				} 
				that.FilterPersonalization.open();//Method to get Logged in user PID
			}
			  	
			);
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().message);
			});
		
		
		
		
		
		
	/*		this.getView().setModel({
				deletePersBtnVisible: false,
				savePersBtnVisible: false
			}, "FilterPersonalization");
			this._loadFragment("Personalization").bind(this);*/
		},
		//for Item
	    onPersonalizationOK: function () {
				var that = this;
			var ListPersonalizationModel = this.getView().getModel("ListPersonalizationModel");
			if (!this.oItemLevelPersonalizationModel) {
				this.oItemLevelPersonalizationModel = sap.ui.xmlfragment("dksh.connectclient.itemblockorder.view.Fragments.ItemPersonalization", this);
				this.getView().addDependent(this.oItemLevelPersonalizationModel);
			}
			var oItemLevelPersonalizationModel = new sap.ui.model.json.JSONModel({
				"results": this.getView().getModel("ListPersonalizationModel").getData()
			});
			this.oItemLevelPersonalizationModel.setModel(oItemLevelPersonalizationModel, "oItemLevelPersonalizationModel");
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/selectVarVisible", true);
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/nameVarVisible", false);
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/enableCheckBox", false);
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/okPersBtnVisible", true);
			this.getView().getModel("ListPersonalizationModel").setProperty("/savePersBtnVisible", false);
			this.getView().getModel("ListPersonalizationModel").setProperty("/cancelPersBtnVisible", true);
			this.getView().getModel("ListPersonalizationModel").setProperty("/deletePersBtnVisible", false);
			this.getView().getModel("ListPersonalizationModel").setProperty("/createPersBtnVisible", true);
			this.getView().getModel("ListPersonalizationModel").setProperty("/editPersBtnVisible", true);
			this.getView().getModel("ListPersonalizationModel").setProperty("/varinatNameValueState", "None");
			this.selectedObjects = [];
			this.getView().getModel("ListPersonalizationModel").refresh();
			this.oItemLevelPersonalizationModel.close();
		},
		
		//for search
		onVariantOK: function () {
			var that = this;
			var PersonalizationModel = this.getView().getModel("PersonalizationModel");
			if (!this.FilterPersonalization) {
				this.FilterPersonalization = sap.ui.xmlfragment("incture.com.ConnectClient_Inventory.Fragments.FilterPersonalization", this);
				this.getView().addDependent(this.FilterPersonalization);
			}
			var FilterPersonalization = new sap.ui.model.json.JSONModel({
				"results": this.getView().getModel("PersonalizationModel").getData()
			});
			this.FilterPersonalization.setModel(FilterPersonalization, "FilterPersonalization");
			this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/results/selectVarVisible", true);
			this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/results/nameVarVisible", false);
			this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/results/enableCheckBox", false);
			this.FilterPersonalization.getModel("FilterPersonalization").refresh();
			
			this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/okPersBtnVisible", true);
			this.getView().getModel("PersonalizationModel").setProperty("/savePersBtnVisible", false);
			this.getView().getModel("PersonalizationModel").setProperty("/cancelPersBtnVisible", true);
			this.getView().getModel("PersonalizationModel").setProperty("/deletePersBtnVisible", false);
			this.getView().getModel("PersonalizationModel").setProperty("/createPersBtnVisible", true);
			this.getView().getModel("PersonalizationModel").setProperty("/editPersBtnVisible", true);
			this.getView().getModel("PersonalizationModel").setProperty("/varinatNameValueState", "None");
			this.selectedObjects = [];
			this.getView().getModel("PersonalizationModel").refresh();
		    
			this.FilterPersonalization.close();
		},
		
		/*	onPressPersonalization: function () {
			this.selectedObjects = [];
			this.FilterPersonalization.close();
		},*/
		onPersonlizationClose: function () {
			this.selectedObjects = [];
			this.FilterPersonalization.close();
		},
		
			onPersonalizationCloseItem: function () {
			this.selectedObjects = [];
			this.oItemLevelPersonalizationModel.close();
		},
		onVariantCreate: function () {
			var PersonalizationModel = this.FilterPersonalization.getModel("FilterPersonalization");
			PersonalizationModel.setProperty("/results/action", "Create");
			PersonalizationModel.setProperty("/selectVarVisible", false);
			PersonalizationModel.setProperty("/nameVarVisible", true);
			PersonalizationModel.setProperty("/enableCheckBox", true);
			PersonalizationModel.setProperty("/okPersBtnVisible", false);
			PersonalizationModel.setProperty("/savePersBtnVisible", true);
			PersonalizationModel.setProperty("/newVariantName", "");
			var fieldData = PersonalizationModel.getData().results.userPersonaDto;
			for (var i = 0; i < fieldData.length; i++) {
				fieldData[i].status = false;
			}
			PersonalizationModel.setProperty("/results/userPersonaDto", fieldData);
			this.FilterPersonalization.getModel("FilterPersonalization").refresh();
		},
		onVariantSave: function (oEvent) {
			if (this.selectedObjects.length === 0) {
				MessageToast.show(this.getView().getModel("i18n").getProperty("saveAfterEdit"));
				return;
			}
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			var PersonalizationModel = this.FilterPersonalization.getModel("FilterPersonalization");
			if (PersonalizationModel.getProperty("/results/action") === "Create") {
				if (PersonalizationModel.getData().newVariantName !== undefined && PersonalizationModel.getData().newVariantName !==
					"") {
					for (var j = 0; j < PersonalizationModel.getData().results.variantName.length; j++) {
						if (PersonalizationModel.getData().results.variantName[j].name === PersonalizationModel.getData().newVariantName) {
							this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/varinatNameValueState", "Error");
							MessageBox.error(this.getView().getModel("i18n").getProperty("newVariant"));
							return;
						}
					}
					this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/varinatNameValueState", "None");
					var VariantName = PersonalizationModel.getData().newVariantName;
					for (var i = 0; i < this.selectedObjects.length; i++) {
						this.selectedObjects[i].variantId = VariantName;
					}

				} else {
					this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/varinatNameValueState", "Error");
					sap.m.MessageBox.error(this.getView().getModel("i18n").getProperty("enterVariant"));
					return;
				}
			}
			var payload = {
				"varaiantObject": this.selectedObjects,
				"userId": this.getView().getModel("userapi").getProperty("/name"),
				"applicationId": "keySearchReleaseBlock",
				"varaintId": this.selectedObjects[0].variantId
			};
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var busyDialog = new sap.m.BusyDialog();
			busyDialog.open();
			oModel.loadData("/DKSHJavaService2/variant/UpdateVariant", JSON.stringify(payload), true, "PUT", false,
				false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				busyDialog.close();
				that.selectedObjects = [];
				that.FilterPersonalization.close();
				sap.m.MessageBox.success(that.getView().getModel("i18n").getProperty("created"), {
					actions: [sap.m.MessageBox.Action.OK],
					onClose: function (sAction) {
						if (sAction === MessageBox.Action.OK) {
							that._getFilterPersonalizationDetails(that.currentStep, "Before");
						}
					}
				});
			});
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().message);
			});
		},
		
			_getFilterPersonalizationDetails: function () {
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			that.getView().setModel(oModel, "oModel");
			var screen = "Web";
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var payload = {
				"userId": this.getView().getModel("userapi").getProperty("/name"),
				"appId": "keySearchReleaseBlock",
				"runType": screen,
				"emailId": this.getView().getModel("userapi").getData().email
			};
				oModel.loadData("/DKSHJavaService2/variant/getVariant", JSON.stringify(payload), true, "POST", false, false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				if (success.getSource().getData().userPersonaDto !== null) {
					that.getView().getModel("PersonalizationModel").setProperty("/personalizationFilterBlockData", success.getSource().getData());
					that.getView().getModel("PersonalizationModel").refresh();
					var FilterPersonalization = new sap.ui.model.json.JSONModel({});
					FilterPersonalization.setData({
						"enableCheckBox": false,
						"selectVarVisible": true,
						"nameVarVisible": false,
						"okPersBtnVisible": true,
						"savePersBtnVisible": false,
						"cancelPersBtnVisible": true,
						"deletePersBtnVisible": false,
						"createPersBtnVisible": true,
						"varinatNameValueState": "None",
						"editPersBtnVisible": true,
						"results": success.getSource().getData()
					});
					if (that.FilterPersonalization) {
						that.FilterPersonalization.setModel(FilterPersonalization, "FilterPersonalization");
						that.FilterPersonalization.getModel("FilterPersonalization").refresh();
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/results/action", "");
					   	
					}
				} //Method to get Logged in user PID
			});
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().message);
			});
		
		},
			_getItemPersonalizationDetails: function () {
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			that.getView().setModel(oModel, "oModel");
		var screen = "Web";
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var payload = {
				"userId": this.getView().getModel("userapi").getProperty("/name"),
		
				//	var pID = this.getView().getModel("oUserModel").getData().
				"appId": "keyHeaderReleaseBlock@keyItemReleaseBlock",
				"runType": screen,
				"emailId": this.getView().getModel("userapi").getData().email
			};
			oModel.loadData("/DKSHJavaService2/variant/getVariantReleaseOrder", JSON.stringify(payload), true, "POST", false, false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				if (success.getSource().getData().userPersonaDto !== null) {
					that.getView().getModel("ListPersonalizationModel").setProperty("/personalizationItemData", success.getSource().getData());
					var oItemLevelPersonalizationModel = new sap.ui.model.json.JSONModel({});
					oItemLevelPersonalizationModel.setData({
						"enableCheckBox": false,
						"selectVarVisible": true,
						"nameVarVisible": false,
						"okPersBtnVisible": true,
						"savePersBtnVisible": false,
						"cancelPersBtnVisible": true,
						"deletePersBtnVisible": false,
						"createPersBtnVisible": true,
						"varinatNameValueState": "None",
						"editPersBtnVisible": true,
						"results": success.getSource().getData()
					});
					if (that.oItemLevelPersonalizationModel) {
						that.oItemLevelPersonalizationModel.setModel(oItemLevelPersonalizationModel, "oItemLevelPersonalizationModel");
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/action", "");
					}
				} //Method to get Logged in user PID
			});
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().message);
			});
		
		},
		onChangeCheckboxItem: function (oEvent) {
			var personalizationItemData = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getData().results.item.userPersonaDto;
			var path = parseInt(oEvent.getSource().getBindingContext("oItemLevelPersonalizationModel").getPath().split("/")[4]);
			if (oEvent.getSource().getSelected() === true) {
				for (var j = 0; j < personalizationItemData.length; j++) {
					if (j === path) {
						personalizationItemData[j].status = true;
					}
					if (this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getProperty("/results/action") === "Create") {
						personalizationItemData[j].id = "";
					}
				}
			} else {
				for (var i = 0; i < personalizationItemData.length; i++) {
					if (i === path) {
						personalizationItemData[i].status = false;
					}
				}
			}
			this.selectedItemObjects = personalizationItemData;
		},
	    onChangeCheckboxHeader: function (oEvent) {
			var personalizationHeaderData = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getData().results.header.userPersonaDto;
			var path = parseInt(oEvent.getSource().getBindingContext("oItemLevelPersonalizationModel").getPath().split("/")[4]);
			if (oEvent.getSource().getSelected() === true) {
				for (var j = 0; j < personalizationHeaderData.length; j++) {
					if (j === path) {
						personalizationHeaderData[j].status = true;
					}
					if (this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getProperty("/results/action") === "Create") {
						personalizationHeaderData[j].id = "";
					}
				}
			} else {
				for (var i = 0; i < personalizationHeaderData.length; i++) {
					if (i === path) {
						personalizationHeaderData[i].status = false;
					}
				}
			}
			this.selectedHeaderObjects = personalizationHeaderData;
		},
		onChangeCheckbox: function (oEvent) {
			var personalizationData = this.FilterPersonalization.getModel("FilterPersonalization").getData().results.userPersonaDto;
			var path = parseInt(oEvent.getSource().getBindingContext("FilterPersonalization").getPath().split("/")[3]);
			if (oEvent.getSource().getSelected() === true) {
				for (var j = 0; j < personalizationData.length; j++) {
					if (j === path) {
						personalizationData[j].status = true;
					}
					if (this.FilterPersonalization.getModel("FilterPersonalization").getProperty("/results/action") === "Create") {
						personalizationData[j].id = "";
					}
					this.selectedObjects = personalizationData;
				}
			} else {
				for (var i = 0; i < personalizationData.length; i++) {
					if (i === path) {
						personalizationData[i].status = false;
					}
				}
				this.selectedObjects = personalizationData;
			}
		},
		onSelectvarian: function (oEvent) {
			var that = this;
			var pID = this.getView().getModel("userapi").getProperty("/name");
			var oModel = new sap.ui.model.json.JSONModel();
			that.getView().setModel(oModel, "oModel");
			var varinatName;
			if (oEvent) {
				varinatName = oEvent.getSource().getSelectedKey();
			} else {
				varinatName = this.FilterPersonalization.getModel("FilterPersonalization").getData().results.currentVariant;
			}
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var screen = "Web";
			// if (sap.ui.Device.system.phone === true) {
			// 	screen = "Phone";
			// }
			var busyDialog = new sap.m.BusyDialog();
			busyDialog.open();
			oModel.loadData("/DKSHJavaService2/variant/getvariantLists/" + pID + "/keySearchReleaseBlock/" + varinatName + "/" + screen,
				true,
				"POST", false,
				false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				busyDialog.close();
				var success = success.getSource().getData().userPersonaDto;
				if (that.FilterPersonalization.getModel("FilterPersonalization").getProperty("/results/action") === "Edit") {
					that.getView().getModel("PersonalizationModel").setProperty("/personalizationFilterBlockData/userPersonaDto", success);
					that.FilterPersonalization.getModel("FilterPersonalization").setProperty(
						"/results/userPersonaDto", success);
					that.FilterPersonalization.getModel("FilterPersonalization").refresh();
					that.getView().getModel("PersonalizationModel").refresh();
					if (that.FilterPersonalization.getModel("FilterPersonalization").getProperty(
							"/results/currentVariant") ===
						"Default") {
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/results/action", "");
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/enableCheckBox", false);
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/savePersBtnVisible", false);
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/okPersBtnVisible", true);
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/deletePersBtnVisible", false);
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/selectVarVisible", true);
						that.FilterPersonalization.getModel("FilterPersonalization").setProperty("/nameVarVisible", false);
						MessageToast.show(that.getView().getModel("i18n").getProperty("cannotEdit"));
						that.FilterPersonalization.getModel("FilterPersonalization").refresh();
					}
				} else {
					that.getView().getModel("PersonalizationModel").setProperty("/personalizationFilterBlockData/userPersonaDto", success);
					that.FilterPersonalization.getModel("FilterPersonalization").setProperty(
						"/results/userPersonaDto", success);
					that.FilterPersonalization.getModel("FilterPersonalization").refresh();
					that.getView().getModel("PersonalizationModel").refresh();
				}
			});
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().message);
			});
		},
	    onSelectvarianItem: function (oEvent) {
			var that = this;
			var pID = this.getView().getModel("userapi").getProperty("/name");
			var oModel = new sap.ui.model.json.JSONModel();
			that.getView().setModel(oModel, "oModel");
			var varinatName;
			if (oEvent) {
				varinatName = oEvent.getSource().getSelectedKey();
			} else {
				varinatName = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getData().results.currentVariant;
			}
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var screen = "Web";
			// if (sap.ui.Device.system.phone === true) {
			// 	screen = "Phone";
			// }
			var busyDialog = new sap.m.BusyDialog();
			busyDialog.open();
			oModel.loadData("/DKSHJavaService2/variant/getvariantListsReleaseOrder/" + pID + "/keyHeaderReleaseBlock@keyItemReleaseBlock/" + varinatName + "/" + screen,
				true,
				"POST", false,
				false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				busyDialog.close();
				var successheader = success.getSource().getData().header.userPersonaDto;
				var successitem = success.getSource().getData().item.userPersonaDto;
				if (that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getProperty("/results/action") === "Edit") {
					that.getView().getModel("ListPersonalizationModel").setProperty("/personalizationItemData/header/userPersonaDto", successheader);
					that.getView().getModel("ListPersonalizationModel").setProperty("/personalizationItemData/item/userPersonaDto", successitem);
					that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty(
						"/results/header/userPersonaDto", successheader);
					that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty(
						"/results/item/userPersonaDto", successitem);
					that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
					that.getView().getModel("ListPersonalizationModel").refresh();
					if (that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getProperty(
							"/results/currentVariant") ===
						"Default") {
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/action", "");
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/enableCheckBox", false);
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/savePersBtnVisible", false);
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/okPersBtnVisible", true);
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/deletePersBtnVisible", false);
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/selectVarVisible", true);
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/nameVarVisible", false);
						MessageToast.show(that.getView().getModel("i18n").getProperty("cannotEdit"));
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
					}
				} else {
					//that.getView().getModel("ListPersonalizationModel").setProperty("/personalizationItemBlockData/userPersonaDto", success);
				    that.getView().getModel("ListPersonalizationModel").setProperty("/personalizationItemData/header/userPersonaDto", successheader);
					that.getView().getModel("ListPersonalizationModel").setProperty("/personalizationItemData/item/userPersonaDto", successitem);
					//that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty(
					//	"/results/userPersonaDto", success);
					that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty(
						"/results/header/userPersonaDto", successheader);
					that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty(
						"/results/item/userPersonaDto", successitem);
					that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
					that.getView().getModel("ListPersonalizationModel").refresh();
				}
			});
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().message);
			});
		},
		onVariantEdit: function () {
			var PersonalizationModel = this.FilterPersonalization.getModel("FilterPersonalization");
			if (PersonalizationModel.getData().results.currentVariant === "Default") {
				MessageToast.show(this.getView().getModel("i18n").getProperty("cannotEdit"));
				return;
			}
			PersonalizationModel.setProperty("/results/action", "Edit");
			this.FilterPersonalization.getModel("FilterPersonalization").setProperty("/okPersBtnVisible", false);
			PersonalizationModel.setProperty("/enableCheckBox", true);
			PersonalizationModel.setProperty("/savePersBtnVisible", true);
			PersonalizationModel.setProperty("/deletePersBtnVisible", true);
			PersonalizationModel.setProperty("/selectVarVisible", true);
			PersonalizationModel.setProperty("/nameVarVisible", false);
			PersonalizationModel.refresh();
			this.onSelectvarian();
		},
		onVariantDelete: function () {
			var that = this;
			var data = this.FilterPersonalization.getModel("FilterPersonalization").getProperty("/results/userPersonaDto");
			var payload = {
				"userId": this.getView().getModel("userapi").getProperty("/name"),
				"applicationId": "keySearchReleaseBlock",
				"varaiantObject": data,
				"varaintId": this.FilterPersonalization.getModel("FilterPersonalization").getProperty(
					"/results/userPersonaDto")[0].variantId
			};
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var oModel = new sap.ui.model.json.JSONModel();
			var busyDialog = new sap.m.BusyDialog();
			busyDialog.open();
			oModel.loadData("/DKSHJavaService2/variant/deleteVariant", JSON.stringify(payload), true, "DELETE", false,
				false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				busyDialog.close();
				that.FilterPersonalization.close();
				// 	// var message = oNewEvent.getSource().getData().message;
				sap.m.MessageBox.success(success.getSource().getData().name, {
					actions: [sap.m.MessageBox.Action.OK],
					onClose: function (sAction) {
						if (sAction === MessageBox.Action.OK) {
							that._getFilterPersonalizationDetails();
						}
					}
				});
			});
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().name);
			});
		},
		onVariantSaveItem: function (oEvent) {
			if (this.selectedHeaderObjects.length === 0 && this.selectedItemObjects.length ===0) {
				MessageToast.show(this.getView().getModel("i18n").getProperty("saveAfterEdit"));
				return;
			}
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			var ListPersonalizationModel = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel");
			if (ListPersonalizationModel.getProperty("/results/action") === "Create") {
				if (ListPersonalizationModel.getData().newVariantName !== undefined && ListPersonalizationModel.getData().newVariantName !==
					"") {
					for (var j = 0; j < ListPersonalizationModel.getData().results.variantName.length; j++) {
						if (ListPersonalizationModel.getData().results.variantName[j].name === ListPersonalizationModel.getData().newVariantName) {
							this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/varinatNameValueState", "Error");
							MessageBox.error(this.getView().getModel("i18n").getProperty("newVariant"));
							return;
						}
					}
					this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/varinatNameValueState", "None");
					var VariantName = ListPersonalizationModel.getData().newVariantName;
					if(!this.selectedHeaderObjects.length === 0)	
					{
					for (var i = 0; i < this.selectedHeaderObjects.length; i++) {
						this.selectedHeaderObjects[i].variantId = VariantName;
						this.selectedHeaderObjects[i].applicationTab	= "keyHeaderReleaseBlock";
					}
					}
				if(!this.selectedItemObjects.length === 0)
				   {
					for (var k = 0; k < this.selectedItemObjects.length; k++) {
						this.selectedItemObjects[k].variantId = VariantName;
						this.selectedItemObjects[k].applicationTab	= "keyItemReleaseBlock";
					}
                  }
				} else {
					this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/varinatNameValueState", "Error");
					sap.m.MessageBox.error(this.getView().getModel("i18n").getProperty("enterVariant"));
					return;
				}
			}
			var payload = {
				"header": {"userPersonaDto" :  this.selectedHeaderObjects},
				"item": {"userPersonaDto" :  this.selectedItemObjects},
				"userId": this.getView().getModel("userapi").getProperty("/name"),
				"variantId": VariantName,
				//"variantName": VariantName
    			
			};

			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var busyDialog = new sap.m.BusyDialog();
			busyDialog.open();
			oModel.loadData("/DKSHJavaService2/variant/UpdateVariantReleaseOrder", JSON.stringify(payload), true, "PUT", false,
				false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				busyDialog.close();
				that.selectedObjects = [];
				that.oItemLevelPersonalizationModel.close();
				sap.m.MessageBox.success(that.getView().getModel("i18n").getProperty("created"), {
					actions: [sap.m.MessageBox.Action.OK],
					onClose: function (sAction) {
						if (sAction === MessageBox.Action.OK) {
							that._getItemPersonalizationDetails(that.currentStep, "Before");
						}
					}
				});
			});
			oModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().message);
			});
		},
		onVariantEditItem: function () {
			var ListPersonalizationModel = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel");
			if (ListPersonalizationModel.getData().results.currentVariant === "Default") {
				MessageToast.show(this.getView().getModel("i18n").getProperty("cannotEdit"));
				return;
			}
			ListPersonalizationModel.setProperty("/results/action", "Edit");
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/okPersBtnVisible", false);
			ListPersonalizationModel.setProperty("/enableCheckBox", true);
			ListPersonalizationModel.setProperty("/savePersBtnVisible", true);
			ListPersonalizationModel.setProperty("/deletePersBtnVisible", true);
			ListPersonalizationModel.setProperty("/selectVarVisible", true);
			ListPersonalizationModel.setProperty("/nameVarVisible", false);
			ListPersonalizationModel.refresh();
			this.onSelectvarianItem();
		},
		onVariantCreateItem: function () {
			var ListPersonalizationModel = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel");
			ListPersonalizationModel.setProperty("/results/action", "Create");
			ListPersonalizationModel.setProperty("/selectVarVisible", false);
			ListPersonalizationModel.setProperty("/nameVarVisible", true);
			ListPersonalizationModel.setProperty("/enableCheckBox", true);
			ListPersonalizationModel.setProperty("/okPersBtnVisible", false);
			ListPersonalizationModel.setProperty("/savePersBtnVisible", true);
			ListPersonalizationModel.setProperty("/newVariantName", "");
			var fieldData = ListPersonalizationModel.getData().results.header.userPersonaDto;
			for (var i = 0; i < fieldData.length; i++) 
			{
			     fieldData[i].status = false;
			}
			ListPersonalizationModel.setProperty("/results/userPersonaDto", fieldData);
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
		},
	
		onVariantDeleteItem: function (oEvent) {
			var that = this;
			var oPersDeleteModel = new sap.ui.model.json.JSONModel();
			var headerdata = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getProperty("/results/header");
			var itemdata = this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getProperty("/results/item/");
			var payload = {
				
			//	"applicationId": "keyHeaderReleaseBlock@keyItemReleaseBlock",
				"header": headerdata,
			     "item": itemdata,
			     "userId": this.getView().getModel("userapi").getProperty("/name"),
				"variantId": this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").getProperty(
					"/results/header/userPersonaDto")[0].variantId
			};
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			
			var busyDialog = new sap.m.BusyDialog();
			busyDialog.open();
			oPersDeleteModel.loadData("/DKSHJavaService2/variant/deleteVariantReleaseOrder", JSON.stringify(payload), true, "DELETE", false,
				false, oHeader);
			oPersDeleteModel.attachRequestCompleted(function (success) {
				busyDialog.close();
				that.oItemLevelPersonalizationModel.close();
				// 	// var message = oNewEvent.getSource().getData().message;
				sap.m.MessageBox.success(success.getSource().getData().name, {
					actions: [sap.m.MessageBox.Action.OK],
					onClose: function (sAction) {
						if (sAction === MessageBox.Action.OK) {
							that._getItemPersonalizationDetails();
						}
					}
				});
			});
			oPersDeleteModel.attachRequestFailed(function (oEvent) {
				MessageBox.error(oEvent.getSource().getData().name);
			});
		},
		//STRY0012026 Personalization settings for application users - Release Item
		//Personalization for Item
		onPressPersonalization: function (oEvent) {
            var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			that.getView().setModel(oModel, "oModel");
		//	this.getUserDetails();
			var ListPersonalizationModel = new sap.ui.model.json.JSONModel();
			 this.selectedHeaderObjects = [];
		     this.selectedItemObjects = [];
		     this.selectedObjectsItem = [];
		     if (!this.oItemLevelPersonalizationModel) 
			{
				this.oItemLevelPersonalizationModel = sap.ui.xmlfragment("dksh.connectclient.itemblockorder.view.Fragments.ItemPersonalization", this);
				this.getView().addDependent(this.oItemLevelPersonalizationModel);
			}
		
		
			that.getView().setModel(ListPersonalizationModel, "ListPersonalizationModel");
				/*var oItemLevelPersonalizationModel = new sap.ui.model.json.JSONModel({
				"results": this.getView().getModel("ListPersonalizationModel").getData()
			});
			this.oItemLevelPersonalizationModel.setModel(oItemLevelPersonalizationModel, "oItemLevelPersonalizationModel");
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/enableCheckBox", false);
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/selectVarVisible", true);
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/nameVarVisible", false);
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
			this.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
			this.oItemLevelPersonalizationModel.open();*/
			var screen = "Web";
			var oHeader = {
				"Content-Type": "application/json;charset=utf-8"
			};
			var payload = {
				"userId": this.getView().getModel("userapi").getProperty("/name"),
		
				//	var pID = this.getView().getModel("oUserModel").getData().
				"appId": "keyHeaderReleaseBlock@keyItemReleaseBlock",
				"runType": screen,
				"emailId": this.getView().getModel("userapi").getData().email
			};
			oModel.loadData("/DKSHJavaService2/variant/getVariantReleaseOrder", JSON.stringify(payload), true, "POST", false, false, oHeader);
			oModel.attachRequestCompleted(function (success) {
				if (success.getSource().getData().userPersonaDto !== null) {
					that.getView().getModel("ListPersonalizationModel").setProperty("/personalizationItemBlockData", success.getSource().getData());
					var oItemLevelPersonalizationModel = new sap.ui.model.json.JSONModel({});
					oItemLevelPersonalizationModel.setData({
						"enableCheckBox": false,
						"selectVarVisible": true,
						"nameVarVisible": false,
						"okPersBtnVisible": true,
						"savePersBtnVisible": false,
						"cancelPersBtnVisible": true,
						"deletePersBtnVisible": false,
						"createPersBtnVisible": true,
						"varinatNameValueState": "None",
						"editPersBtnVisible": true,
						"results": success.getSource().getData()
					});
					if (that.oItemLevelPersonalizationModel) {
						that.oItemLevelPersonalizationModel.setModel(oItemLevelPersonalizationModel, "oItemLevelPersonalizationModel");
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").refresh();
						that.oItemLevelPersonalizationModel.getModel("oItemLevelPersonalizationModel").setProperty("/results/action", "");
					   	that.oItemLevelPersonalizationModel.open();
					}
				} //Method to get Logged in user PID
			}
			);
		oModel.attachRequestFailed(function (oEvent) {
		MessageBox.error(oEvent.getSource().getData().message);
		});
		
		
		
		
		
		},
		onSearchValueForHeader: function (oEvent) {
			var sValue = oEvent.getParameters().newValue,
				oBinding = this.byId("idList").getBinding("items"),
				aFilters = [];

			if (!oEvent.getParameters().clearButtonPressed && sValue) {
				var oFilter = new Filter({
					filters: this.setBindingFilter(["salesOrderNum", "decisionSetId"], sValue, oBinding),
					and: false
				});
				aFilters.push(oFilter);
				oBinding.filter(aFilters);
			} else {
				oBinding.filter(null);
			}
		},
		onPressEditItem: function (oEvent) {
			var oView = this.getView(),
				oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				oItemBlockModel = oTable.getModel("ItemBlockModel"),
				aItems = oTable.getItems(),
				sPath = oTable.getBindingContext("ItemBlockModel").getPath(),
				aItemUsage = ["B", "C"],
				bBonus = aItems.some(function (oItem) {
					var obj = oItem.getBindingContext("ItemBlockModel").getObject();
					return aItemUsage.includes(obj.higherLevelItemUsage) || (obj.higherLevelItem !== "000000");
				});
			oSource.setVisible(false);
			// Control selected item's properties visibility
			aItems.map(function (oItem) {
				var object = oItem.getBindingContext("ItemBlockModel").getObject();
				object = this.formatter.controlEditabled.call(this, object, bBonus, aItemUsage);
				object.salesUnit = (!object.salesUnit) ? this.getText("UoM").toUpperCase() : object.salesUnit;
			}.bind(this));
			// Store initial value model for onSaveEditItem function
			// In case if item(s) are not valid then reset to initial value in onSaveEditItem or cancelEditItem function
			oView.setModel(new JSONModel(), "initialValueModel");
			oView.getModel("initialValueModel").setData(JSON.parse(oTable.getModel("ItemBlockModel").getJSON()));
			// Set edit button
			oItemBlockModel.setProperty(sPath + "/itemBtnEanbled", false);
			oItemBlockModel.refresh();
		},
		onSaveEditItem: function (oEvent, sFragmentName, oItem) {
			var oView = this.getView(),
				oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				aSelectedContext = oTable.getSelectedContexts(),
				aItems = oTable.getItems(),
				oLoadDataModel = oView.getModel("LoadDataModel"),
				oModel = this.getOwnerComponent().getModel(),
				oUserManagementModel = oView.getModel("UserManagement"),
				aFilters = [],
				aHeadProperties = ["salesOrderNum"],
				aDetailProperties = ["salesOrderNum", "salesOrmderDate", "orderType", "orderTypeText", "customerPoDate", "soldToParty",
					"shipToParty", "shipToPartyText", "decisionSetId", "levelNum"
				];

			// If no selected item
			if (aSelectedContext.length === 0) {
				MessageToast.show(this.getText("ItemSelectList"));
				return;
			}
			this._getTable("idList").setBusy(true);
			this.onSaveEditItem["Payload"] = {};
			for (var index in aHeadProperties) {
				var sHeadProperty = aHeadProperties[index];
				this.onSaveEditItem["Payload"][sHeadProperty] = oItem[sHeadProperty];
			}
			// this.onSaveEditItem["Payload"].workflowId = oItem.processId; // Changed
			// This property loggedInUserName is updating edit item text in ECC
			this.onSaveEditItem["Payload"].loggedInUserName = oUserManagementModel.getData().userName;
			for (index in aDetailProperties) {
				var aDetailProperty = aDetailProperties[index];
				this.onSaveEditItem["Payload"][aDetailProperty] = oItem[aDetailProperty];
			}
			this.onSaveEditItem["Payload"].headerDeliveryBlockCode = oItem.headerBillBlockCode;
			this.onSaveEditItem["Payload"].headerDeliveryBlockCodeText = oItem.headerBillBlockCodeText;
			this.onSaveEditItem["Payload"].customerPoNum = oItem.customerPo;
			this.onSaveEditItem["Payload"].soldToPartyText = oItem.shipToPartyText;
			this.onSaveEditItem["Payload"].amount = oItem.totalNetAmount;
			this.onSaveEditItem["Payload"].headerMessage = oItem.headerMsg;
			this.onSaveEditItem["Payload"].listOfChangedItemData = [];
			this.onSaveEditItem["aItems"] = aItems; // Set field visible using this later in formatter.setCancelEditItem
			this.onSaveEditItem["sBindingPath"] = oTable.getBindingContext("ItemBlockModel").getPath();
			for (var indx in aSelectedContext) {
				var sPath = aSelectedContext[indx].getPath();

				oItem = aSelectedContext[indx].getProperty(sPath);
				oItem.salesItemOrderNo = oItem.salesItemOrderNo;
				oItem.unitPrice = oItem.netPrice;
				oItem.salesQty = oItem.orderedQtySales;
				oItem.material = oItem.sapMaterialNum;
				oItem.salesUnit = oItem.salesUnit;
				oItem.storageLocValue = oItem.storageLoc;
				oItem.batchNum = oItem.batchNum;
				oItem.from = "edit";
				oItem.sPath = [oItem.salesItemOrderNo, "|", sPath].join("");
				var oFilter = new Filter({
					filters: this.setODataFilter([
						"salesHeaderNo", "salesItemOrderNo", "sPath"
					], oItem),
					and: true
				});
				aFilters.push(oFilter);
				this.onSaveEditItem["Payload"].listOfChangedItemData.push(oItem);
			}
			// Validate if item has rejection or SO blocked prior update item to ECC
			Promise.all([this.formatter.fetchData.call(this, oModel, "/ValidateItemsBeforeSaveSet", aFilters)]).
			then(function (oRes) {
				var sFragmentPath = this.getText("MainFragmentPath");

				if (!this.oFragmentList[sFragmentName]) {
					this.oFragmentList[sFragmentName] = sap.ui.xmlfragment(sFragmentPath + sFragmentName, this);
					oView.addDependent(this.oFragmentList[sFragmentName]);
				}
				this.oFragmentList[sFragmentName].setModel(new JSONModel(oRes[0]), "SavedMessageModel");
				this.onSaveEditItem["aResetChangesPath"] = oRes[0].results.filter(function (item) {
					return !item.isValid;
				}).map(function (obj) {
					return obj.sPath;
				});
				this.onSaveEditItem["Payload"].listOfChangedItemData = this.onSaveEditItem["Payload"].listOfChangedItemData.filter(function (
					array) {
					return oRes[0].results.some(function (filter) {
						return filter.salesItemOrderNo === array.salesItemOrderNo && (filter.isValid);
					});
				});
				// Exit if no valid item(s) to be updated
				if (this.onSaveEditItem["Payload"].listOfChangedItemData.length === 0) {
					this.oFragmentList[sFragmentName].open();
					this._resetSavedItem(sFragmentName);
					return;
				}
				// Update to ECC and hana DB
				this.formatter.postJavaService.call(this, oLoadDataModel, "/DKSHJavaService/OdataServices/updateOnSaveOrEdit", JSON.stringify(
					this.onSaveEditItem["Payload"])).then(function (oResponse) {
					if (oLoadDataModel.getData().status === "FAILED") {
						this._displayError(oLoadDataModel.getData().message, "SaveFailedMessage").bind(this);
						return;
					}
					this.oFragmentList[sFragmentName].open();
					this._resetSavedItem(sFragmentName);
				}.bind(this));
				// }.bind(this)).catch(this._displayWarning("Failed to update to ECC").bind(this));
			}.bind(this)).catch(function (oErrResp) {
				this._displayWarning("Failed to update to ECC").bind(this);
			}.bind(this));
		},
		_resetSavedItem: function (sFragmentName) {
			var oItemBlockModel = this.getView().getModel("ItemBlockModel"),
				oInitialValueModel = this.getView().getModel("initialValueModel");

			// Reset to initial value
			if (this.onSaveEditItem["aResetChangesPath"].length > 0) {
				for (var index in this.onSaveEditItem["aResetChangesPath"]) {
					var sPath = this.onSaveEditItem["aResetChangesPath"][index];
					oItemBlockModel.setProperty(sPath, oInitialValueModel.getProperty(sPath));
				}
			}
			oItemBlockModel.setProperty(this.onSaveEditItem["sBindingPath"] + "/itemBtnEanbled", true);
			this.formatter.setCancelEditItem.call(this, oItemBlockModel, this.onSaveEditItem["aItems"]);
			this._getTable("idList").setBusy(false);
		},
		onCancelEditItem: function (oEvent) {
			var oView = this.getView(),
				oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				oItemBlockModel = oTable.getModel("ItemBlockModel"),
				sBindingPath = oTable.getBindingContext("ItemBlockModel").getPath(),
				oInitialValueModel = oView.getModel("initialValueModel"),
				aItems = oTable.getItems();

			oItemBlockModel.setProperty(sBindingPath + "/itemBtnEanbled", true);
			for (var index in aItems) {
				var sPath = aItems[index].getBindingContextPath();
				oItemBlockModel.setProperty(sPath, oInitialValueModel.getProperty(sPath));
			}
			this.formatter.setCancelEditItem.call(this, oItemBlockModel, aItems);
		},
		onChangeItemValue: function (oEvent, sProperty) {
			var oView = this.getView(),
				oSource = oEvent.getSource(),
				oBindingContext = oSource.getParent().getBindingContext("ItemBlockModel"),
				oItem = oBindingContext.getProperty(oBindingContext.getPath()),
				oDataModel = oView.getModel(),
				oEntry = {},
				aDataProperties = ["salesHeaderNo", "salesItemOrderNo", "sapMaterialNum", "shortText", "orderedQtySales", "salesUnit", "netPrice",
					"splPrice", "netWorth", "docCurrency", "storageLoc", "batchNum"
				];

			if (sProperty === "Material" && !oEvent.getParameters().newValue) {
				MessageToast.show("Make sure material is not empty");
				return;
			}

			oView.setBusy(true);
			// Call oData to simulate the price for the material
			for (var indx in Object.keys(aDataProperties)) {
				var sDataProperty = aDataProperties[indx];
				oEntry[sDataProperty] = oItem[sDataProperty].toString();
			}
			oEntry.modelPath = oBindingContext.getPath();
			Promise.all([this.formatter.createData.call(this, oDataModel, "/ItemSimulationSet", oEntry)]).then(function (oRes) {
				var sPath = oRes[0].modelPath,
					oItemBlockModel = this.getView().getModel("ItemBlockModel");

				oItem = oRes[0];
				delete oItem.modelPath;
				for (var index in Object.keys(oItem)) {
					sProperty = Object.keys(oItem)[index];
					if (typeof oItem[sProperty] !== "object") {
						if (typeof oItemBlockModel.getProperty(sPath)[sProperty] === "string") {
							oItemBlockModel.getProperty(sPath)[sProperty] = oItem[sProperty];
						} else {
							oItemBlockModel.getProperty(sPath)[sProperty] = +oItem[sProperty];
						}
					}
				}
				oItemBlockModel.refresh();
				oView.setBusy(false);
			}.bind(this)).catch(this._displayWarning.bind(this));
		},
		onApprovePress: function (oEvent, oItem) {
			var oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId);

			if (oTable.getSelectedItems().length === 0) {
				MessageToast.show(this.getText("ItemSelectList"));
				return;
			}
			// Need to enhance logic if it's final level or not
			//debugger;
			this.onApprovePress["Table"] = oTable;
			var fnCloseApprove = function (oAction) {
				oTable = this.onApprovePress["Table"];
				if (oAction === "YES") {
					for (var index in oTable.getSelectedContexts()) {
						var oSelectedContext = oTable.getSelectedContexts()[index],
							sPath = oSelectedContext.getPath();

						oSelectedContext.getModel().setProperty([sPath, "/acceptOrReject"].join(""), "A");
						oSelectedContext.getModel().setProperty([sPath, "/itemStagingStatus"].join(""), "Pending Approval");
						// Set both comment and reject reason text to blank for user action
						oSelectedContext.getModel().setProperty([sPath, "/reasonForRejectionText"].join(""), "");
						oSelectedContext.getModel().setProperty([sPath, "/comments"].join(""), "");
					}
					oTable.removeSelections();
				}
			}.bind(this);

			// As discussed, java will set levelStatus = 4 when any item reached to last level or single level approver.
			var sApprvMsg = ["(", oTable.getSelectedItems().length, ")", (!oItem.salesDocItemList[0].nextLevel) ?
				" Item(s) approved completely" : " Item(s) approved"
			].join("");
			MessageBox.show(sApprvMsg, {
				icon: MessageBox.Icon.INFORMATION,
				title: "Sales Document: " + oItem.salesOrderNum,
				actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
				onClose: fnCloseApprove,
				initialFocus: MessageBox.Action.CANCEL,
				styleClass: sResponsivePaddingClasses
			});
		},
		onRejectPress: function (oEvent, sFragment, oItem, oModel) {
			var oView = this.getView(),
				oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				aRejectModel = [];

			if (oTable.getSelectedItems().length === 0) {
				MessageToast.show(this.getText("ItemSelectList"));
				return;
			}
			for (var indx in oTable.getSelectedContexts()) {
				var oSelectedContext = oTable.getSelectedContexts()[indx];
				aRejectModel.push(Object.assign(oSelectedContext.getObject(), {
					sPath: oSelectedContext.getPath()
				}));
			}
			oView.setModel(new JSONModel(aRejectModel), "RejectDataModel");
			oView.setBusy(true);
			this.onRejectPress["Table"] = oTable;
			if (!this.oFragmentList[sFragment]) {
				this._loadFragment(sFragment);
				this.oFragmentList[sFragment].open();
			} else {
				this.oFragmentList[sFragment].open();
				oView.setBusy(false);
			}
		},
		onOkRejectPress: function (oEvent, aItems, aSet) {
			var oView = this.getView(),
				oItemBlockModel = oView.getModel("ItemBlockModel");

			for (var index in aItems) {
				var oItem = aItems[index],
					sRejectText = sap.ui.getCore().byId(oItem.selectedId).getProperty("text");

				oItemBlockModel.setProperty([oItem.sPath, "/acceptOrReject"].join(""), "R");
				oItemBlockModel.setProperty([oItem.sPath, "/itemStagingStatus"].join(""), "Pending for Rejection");
				oItemBlockModel.setProperty([oItem.sPath, "/reasonForRejectionText"].join(""), sRejectText);
			}
			this.onRejectPress["Table"].removeSelections();
			this.handleCloseValueHelp(oEvent, "Reject");
		},
		onRejectCommonReasonChange: function (oEvent) {
			var oSelectedKey = oEvent.getSource().getSelectedItem(),
				oItems = oEvent.getSource().getParent().getParent().getItems();
			for (var index in oItems) {
				oItems[index].getCells()[2].setSelectedItem(oSelectedKey);
			}
		},
		onAddRejectComments: function (oEvent, aItems) {
			var oView = this.getView(),
				oItemBlockModel = oView.getModel("ItemBlockModel");

			for (var index in aItems) {
				var oItem = aItems[index];
				oItemBlockModel.setProperty([oItem.sPath, "/comments"].join(""), oEvent.getParameter("value"));
			}
		},
		onItemTableFreeSearch: function (oEvent) {
			var sValue = oEvent.getParameters().newValue,
				// Can't get ID by view since each panel ID is generated dynamically from control itself
				// In this case, have to use sap.ui.core() to get the object of the sId
				sId = oEvent.getSource().getParent().getParent().getId(),
				oBinding = sap.ui.getCore().byId(sId).getBinding("items"),
				aFilters = [];

			if (!oEvent.getParameters().clearButtonPressed && sValue) {
				var oFilterString = new Filter({
						filters: this.setBindingFilter(["salesItemOrderNo", "shortText", "sapMaterialNum", "salesUnit", "netPrice", "splPrice",
								"netWorth", "storageLoc", "batchNum", "materialGroup",
								"materialGroup4", "itemDlvBlockText", "itemDlvBlock", "itemCategText", "itemCategory", "oldMatCode", "itemStagingStatus"
							],
							sValue, oBinding),
						and: false
					}),
					oFilterNumber = new Filter({
						filters: this.setBindingFilter(["orderedQtySales"],
							sValue, oBinding),
						and: false
					}),
					aBindingFilters = new Filter({
						filters: [oFilterString, oFilterNumber]
					});
				aFilters.push(aBindingFilters);
				oBinding.filter(aFilters);
			} else {
				oBinding.filter(null);
			}
		},
		onDisplayMarkedItems: function (oEvent, sFragmentName, oItemModel) {
			var sFragmentPath = this.getText("MainFragmentPath");
			if (!this.oFragmentList[sFragmentName]) {
				this.oFragmentList[sFragmentName] = sap.ui.xmlfragment(sFragmentPath + sFragmentName, this);
				this.getView().addDependent(this.oFragmentList[sFragmentName]);
				this.oFragmentList[sFragmentName].addStyleClass("sapUiSizeCompact");
				this.oFragmentList[sFragmentName].setModel(new JSONModel(oItemModel), "DisplayActionModel");
				this.oFragmentList[sFragmentName].open();
			} else {
				this.oFragmentList[sFragmentName].setModel(new JSONModel(oItemModel), "DisplayActionModel");
				this.oFragmentList[sFragmentName].open();
			}
		},
		onResetDisplay: function (oEvent) {
			var oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId);

			if (oTable.getSelectedItems().length === 0) {
				return;
			}
			oTable.removeSelections();
		},
		// On Search data
		onSearchSalesHeader: function (oEvent, oFilterSaleOrder) {
			// oSettingModel = oView.getModel("settings");
			// oSettingModel.setProperty("/selectedPage", 1);
			this.formatter.fetchSaleOrder.call(this);
		},
		valueHelpRequest: function (oEvent, sFragment, sField, sAccess, bCheckAccess) {
			var oUserAccessModel = this.getView().getModel("UserAccess"),
				aItemVH = ["StorageLocation", "BatchNo"],
				aClearFragment = ["SoldToParty"];
		//	debugger;
			if (!oUserAccessModel.getData()[sAccess] && (sAccess) && bCheckAccess) {
				MessageToast.show(this.getText("NoDataAccess"));
				return;
			}
			this.valueHelpId = oEvent.getSource().getId();
			this.vhFilter = "";
			if (oUserAccessModel.getData()[sAccess]) {
				var aValue = oUserAccessModel.getData()[sAccess].split("@");
				// retrieve for blank code
				aValue.push("");
				this.vhFilter = new Filter({
					filters: aValue.map(function (value) {
						return new Filter(sField, FilterOperator.EQ, value);
					}),
					and: false
				});
			}
			if (aItemVH.includes(sFragment)) {
				var oItemLevel = oEvent.getSource().getParent().getParent();
				this.sItemPath = oItemLevel.getBindingContextPath();
			}
			// Destroy fragment avoid duplicate id occur for sold to party
			if (aClearFragment.includes(sFragment) && this.oFragmentList[sFragment]) {
				this.oFragmentList[sFragment].destroy(true);
			}
			this._loadFragment(sFragment, oEvent);
		},
		onSearchSoldToParty: function (oEvent, sFragment, sPath, sId) {
			var oView = this.getView(),
				oData = oView.getModel("filterModel").getData(),
				oTable = this._getTable(sId),
				oModel = oView.getModel("_SoldToParty"),
				aFilters = [];

			if (!oData.SoldToPartId && !oData.SoldToPartName && !oData.SoldToPartSaleOrg && !oData.SoldToPartDivision && !oData.SoldToPartDistChannel) {
				MessageBox.information(this.getText("ItemSelectFilter"));
				return;
			}
			oTable.setBusy(true);
			var oFilter = new Filter({
				filters: this.setODataFilter([
					"CustCode", "Name1", "SalesOrg", "Division", "Distchl", "languageID"
				], {
					"CustCode": oData.SoldToPartId,
					"Name1": oData.SoldToPartName,
					"SalesOrg": oData.SoldToPartSaleOrg,
					"Division": oData.SoldToPartDivision,
					"Distchl": oData.SoldToPartDistChannel,
					"languageID": "E"
				}),
				and: true
			});
			aFilters.push(oFilter);
			this.formatter.fetchData.call(this, oModel, sPath, aFilters).then(function (oRes) {
				Object.assign(oRes, {
					"totalRecords": oRes.results.length
				});
				this.oFragmentList[sFragment].setModel(new JSONModel(oRes), "SoldToPartyModel");
				oTable.setBusy(false);
			}.bind(this)).catch(this._displayWarning.bind(this));
			/*			this._getSmartTable("idSoldToPartSmartTable").rebindTable();*/
		},
		/* Start - Need to enhance*/
		/* =========================================================================================*/
		ValueHelpRequestItem: function (oEvent, sFragment, sPath) {
			var oView = this.getView(),
				// Retrieve the item's record
				oItemLevel = oEvent.getSource().getParent().getParent(),
				oItemModel = oView.getModel("ItemBlockModel"),
				oItemRow = oItemModel.getProperty(oItemLevel.getBindingContextPath()),
				oModel = this.getOwnerComponent().getModel(),
				sFragmentPath = this.getText("FragmentPath"),
				aFilters = [];

			this.sItemPath = oItemLevel.getBindingContextPath();
			if (sFragment === "BatchNo") {
				if (!oItemRow.sapMaterialNum) {
					// Make sure material is populated, otherwise there is performance issue in odata
					MessageToast.show("Make sure material number is populated");
					return;
				}
				var oFilter = new Filter({
					filters: this.setODataFilter([
						"plant", "storageLoc", "sapMaterialNum"
					], oItemRow),
					and: true
				});
				aFilters.push(oFilter);
			}

			if (!this.oFragmentList[sFragment]) {
				Fragment.load({
					id: oView.getId(),
					name: this.formatter.getFragmentPath(sFragmentPath, sFragment),
					controller: this
				}).then(function (oDialog) {
					Promise.all([this.formatter.fetchData.call(this, oModel, sPath, aFilters)]).
					then(function (oRes) {
						this.oFragmentList[sFragment] = oDialog;
						oView.addDependent(oDialog);
						this.oFragmentList[sFragment].setModel(new JSONModel(oRes[0]), "ValueHelpSet");
						this.oFragmentList[sFragment].open();
					}.bind(this)).catch(function (oErr) {
						var errMsg = JSON.parse(oErr.responseText).error.message.value;
						MessageBox.warning(errMsg);
					});
				}.bind(this)).catch(function (oErr) {});
			} else {
				Promise.all([this.formatter.fetchData.call(this, oModel, sPath, aFilters)]).
				then(function (oRes) {
					this.oFragmentList[sFragment].setModel(new JSONModel(oRes[0]), "ValueHelpSet");
					this.oFragmentList[sFragment].open();
				}.bind(this)).catch(function (oErr) {
					var errMsg = JSON.parse(oErr.responseText).error.message.value;
					MessageBox.warning(errMsg);
				});
			}
		},
		handleAddItem: function (oEvent, sPathProperty, sProperty, oValue) {
			var oView = this.getView(),
				selectedObj = oEvent.getParameters().selectedContexts[0].getObject(),
				oItemBlockModel = oView.getModel("ItemBlockModel");

			if (this.sItemPath) {
				oItemBlockModel.setProperty(this.sItemPath + sPathProperty, selectedObj[sProperty]);
			}
			// Set storage location based on batch no
			if (sProperty === "BatchNo") {
				oItemBlockModel.setProperty(this.sItemPath + "/storageLoc", selectedObj["storageLoc"]);
			}
		},
		/* =========================================================================================*/
		onLiveSearchSoldToParty: function (oEvent, sId) {
			var sValue = oEvent.getParameters().newValue,
				oBinding = this._getTable(sId).getBinding("items"),
				aFilters = [];

			if (!oEvent.getParameters().clearButtonPressed && sValue) {
				var oFilterString = new Filter({
						filters: this.setBindingFilter(["CustCode", "Name1", "DName", "DCName", "SOrgName"],
							sValue, oBinding),
						and: false
					}),
					aBindingFilters = new Filter({
						filters: [oFilterString]
					});
				aFilters.push(aBindingFilters);
				oBinding.filter(aFilters);
			} else {
				oBinding.filter(null);
			}
		},
		onLiveChange: function (oEvent, sFilter1, sFilter2) {
			var value = oEvent.getParameters().value,
				filters = [],
				oBinding = oEvent.getSource().getBinding("items");

			if (value) {
				var oFilter = new Filter({
					filters: [new Filter(sFilter1, FilterOperator.Contains, value), new Filter(sFilter2, FilterOperator.Contains, value)],
					and: false
				});
			}
			filters.push(oFilter ? oFilter : this.vhFilter);
			oBinding.filter(filters);
		},
		handleAdd: function (oEvent, sPath, sProperty, sBindModel, sPathReset, sPathSoldParty) {
			var selectedObj = oEvent.getParameters().selectedContexts[0].getObject(),
				oModel = this.getView().getModel(sBindModel),
				sPathM = (this.valueHelpId.includes("idSoldToPart")) ? sPathSoldParty : sPath;

			oModel.setProperty(sPathM, selectedObj[sProperty]);
			// oModel.setProperty(sPath, selectedObj[sProperty]);
			// Need to enhacne next time
			// For storage and batch value help
			if (this.sItemPath) {
				var oSelectedObj = oEvent.getParameters().selectedContexts[0].getObject();
				oModel.setProperty(this.sItemPath + sPath, oSelectedObj[sProperty]);
				if (sPathReset) {
					oModel.setProperty(this.sItemPath + sPathReset, "");
				}
			}
		},
		handleCloseValueHelp: function (oEvent, sFragmentName) {
			if (this.oFragmentList[sFragmentName]) {
				this.oFragmentList[sFragmentName].close();
			}
			this.getView().setBusy(false);
		},
		//	On Cancel for particular fragment
		handleCancel: function (oEvent, sFragmentName) {
			this.valueHelpId = "";
			if (oEvent.getSource().getBinding("items")) {
				oEvent.getSource().getBinding("items").filter([]);
			}
			if (this.oFragmentList[sFragmentName]) {
				this.oFragmentList[sFragmentName].close();
			}
		},
		onItemSubmission: function (oEvent, aItem, sFragmentName) {
		//	debugger;
			var oView = this.getView(),
				oDataModel = oView.getModel(),
				oLoadDataModel = oView.getModel("LoadDataModel"),
				aEntry = {
					navHeaderToValidateItem: []
				},
				aDataProperties = ["salesItemOrderNo", "salesHeaderNo", "sapMaterialNum", "orderedQtySales", "netPrice", "storageLoc", "batchNum"];
			this.aDetailItem = aItem;

			if (this.aDetailItem.salesDocItemList.find(function (oList) {
					return !oList.acceptOrReject;
				})) {
				MessageToast.show(this.getText("noActionTaken"));
				return;
			}
			this._getTable("idList").setBusy(true);
			Object.assign(aEntry, {
				salesHeaderNo: this.aDetailItem.salesOrderNum
			});
			for (var index in this.aDetailItem.salesDocItemList) {
				var oItem = this.aDetailItem.salesDocItemList[index],
					oEntry = {};

				for (index in Object.keys(aDataProperties)) {
					var sDataProperty = aDataProperties[index];
					oEntry[sDataProperty] = oItem[sDataProperty].toString();
				}
				aEntry.navHeaderToValidateItem.push(oEntry);
			}
			// Use create is easy to structure for deep entries
			Promise.all([this.formatter.createData.call(this, oDataModel, "/ValidateBeforeSubmitSet", aEntry)]).then(function (oRes) {
				// if found the data from frontend is not sync with backend, prompt error.
				if (oRes[0].isChanged) {
					if (!this.oFragmentList[sFragmentName]) {
						this.oFragmentList[sFragmentName] = sap.ui.xmlfragment(this.getText("MainFragmentPath") + sFragmentName, this);
						oView.addDependent(this.oFragmentList[sFragmentName]);
					}
					this.oFragmentList[sFragmentName].setModel(new JSONModel(oRes[0].navHeaderToValidateItem), "SubmitMessageModel");
					this.oFragmentList[sFragmentName].open();
					this._getTable("idList").setBusy(false);
					return;
				}
				// Trigger endpoint for submission
				var sUrl = "/DKSHJavaService/taskSubmit/processECCJobNew";
				this.formatter.postJavaService.call(this, oLoadDataModel, sUrl, JSON.stringify(this.aDetailItem)).then(function (oJavaRes) {
					// Fetch the sale order 
					// Can remove the model for performance perstrueve
					if (oLoadDataModel.getData().status === "FAILED") {
						this._displayError(oLoadDataModel.getData().message, "SubmitFailedMessage").bind(this);
						return;
					}
					var fnCloseApprove = function (oAction) {
						if (oAction === "OK") {
							this._getTable("idList").setBusy(false);
							this.formatter.fetchSaleOrder.call(this);
						}
					}.bind(this);
					MessageBox.show(this.getText("SubmitSuccessMessage"), {
						icon: MessageBox.Icon.INFORMATION,
						title: "Information",
						actions: [MessageBox.Action.OK],
						onClose: fnCloseApprove,
						initialFocus: MessageBox.Action.OK,
						styleClass: sResponsivePaddingClasses
					});
				}.bind(this)).catch(function () {
					this._displayError.bind(this);
				});
			}.bind(this)).catch(this._displayWarning.bind(this));
		},
		handleCreditBlockPress: function (oEvent, sOrderNum) {
			var oButton = oEvent.getSource(),
				sFragmentPath = this.getText("MainFragmentPath"),
				oView = this.getView(),
				oModel = this.getOwnerComponent().getModel(),
				oItemRow = {},
				aFilters = [];

			oItemRow["salesOrderNum"] = sOrderNum;
			oItemRow["creditBlock"] = oButton.getProperty("text");
			var oFilter = new Filter({
				filters: this.setODataFilter([
					"salesOrderNum", "creditBlock"
				], oItemRow),
				and: true
			});
			aFilters.push(oFilter);

			if (!this.oFragmentList["CreditBlockReasons"]) {
				Fragment.load({
					id: oView.getId(),
					name: this.formatter.getFragmentPath(sFragmentPath, "CreditBlockReasons"),
					controller: this
				}).then(function (oPopover) {
					Promise.all([this.formatter.fetchData.call(this, oModel, "/CreditStatusSet", aFilters)]).
					then(function (oRes) {
						this.oFragmentList["CreditBlockReasons"] = oPopover;
						oView.addDependent(oPopover);
						this.oFragmentList["CreditBlockReasons"].setModel(new JSONModel(oRes[0]), "CreditBlockReasonsModel");
						this.oFragmentList["CreditBlockReasons"].openBy(oButton);
					}.bind(this)).catch(this._displayWarning.bind(this));
				}.bind(this));
			} else {
				Promise.all([this.formatter.fetchData.call(this, oModel, "/CreditStatusSet", aFilters)]).
				then(function (oRes) {
					this.oFragmentList["CreditBlockReasons"].openBy(oButton);
				}.bind(this)).catch(this._displayWarning.bind(this));
			}
		},
		onSubmitSoldtoParty: function (oEvent) {
			var oView = this.getView(),
				oTable = this._getTable("idSoldtoPartyTable"),
				oFilterModel = oView.getModel("filterModel"),
				sPath = oTable.getSelectedContexts()[0].sPath,
				oData = oTable.getModel("SoldToPartyModel").getProperty(sPath);

			oFilterModel.setProperty("/selectedSoldToParty", oData.CustCode);
			this.handleCancel(oEvent, "SoldToParty");
		},
		// onPageClick: function (oEvent) {
		// 	var sPageNum = +oEvent.getSource().getBindingContext("settings").getObject().pageNum,
		// 		oSettingModel = this.getView().getModel("settings");
		// 	oSettingModel.setProperty("/selectedPage", sPageNum);
		// 	this.formatter.fetchSaleOrder.call(this);
		// },
		// onScrollLeft: function (oEvent) {
		// 	var oSettingModel = this.getView().getModel("settings"),
		// 		sPageNum = +oSettingModel.getProperty("/selectedPage");

		// 	sPageNum--;
		// 	if (sPageNum >= 1) {
		// 		oSettingModel.setProperty("/selectedPage", sPageNum);
		// 		this.formatter.fetchSaleOrder.call(this);
		// 	}
		// },
		// onScrollRight: function (oEvent) {
		// 	var oSettingModel = this.getView().getModel("settings"),
		// 		sPageNum = +oSettingModel.getProperty("/selectedPage"),
		// 		maxPage = oSettingModel.getProperty("/pagination").length;

		// 	/*			if (sPageNum++ < maxPage) {
		// 					oSettingModel.setProperty("/selectedPage", sPageNum);
		// 					this.formatter.fetchSaleOrder.call(this);
		// 				}*/
		// 	// Set 5 pages for now
		// 	if (sPageNum++ < 5) {
		// 		oSettingModel.setProperty("/selectedPage", sPageNum);
		// 		this.formatter.fetchSaleOrder.call(this);
		// 	}
		// },
		onPressRefresh: function () {
			this.formatter.fetchSaleOrder.call(this);
		},
		onReset: function (oEvent) {
			var oFilterModel = this.getView().getModel("filterModel");

			oFilterModel.setData({});
			oFilterModel.updateBindings(true);
		},
		onResetSoldToParty: function (oEvent) {
			var oFilterModel = this.getView().getModel("filterModel");
			this.resetModel(oFilterModel, ["SoldToPartId", "SoldToPartName", "SoldToPartSaleOrg", "SoldToPartDivision", "SoldToPartDistChannel"]);
		},
		_getTable: function (sId) {
			return this.getView().byId(sId);
		}
	});

});