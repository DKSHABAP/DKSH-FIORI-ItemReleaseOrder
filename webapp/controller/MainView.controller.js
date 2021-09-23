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
	// Test
	return BaseController.extend("dksh.connectclient.itemblockorder.controller.MainView", {
		onInit: function () {
			var oView = this.getView();
			// Pre Set Model (Base Controller)
			this.preSetModel(oView);
			this.oFragmentList = [];

			oView.setBusy(true);
			Promise.all([this.formatter.fetchUserInfo.call(this)]).then(function (oRes) {
				this.formatter.fetchSaleOrder.call(this);
			}.bind(this)).catch(function (oErr) {
				this.getView().setBusy(false);
				var errMsg = JSON.parse(oErr.responseText).error.message.value;
				MessageBox.warning(errMsg);
			}.bind(this));
		},
		onExpand: function (oEvent) {},
		onSortPress: function (oEvent, sId, sPath, sField) {
			debugger;
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
		onPressPersonalization: function (oEvent) {
			var oView = this.getView(),
				sFragmentPath = this.getText("MainFragmentPath");

			oView.setModel({
				deletePersBtnVisible: false,
				savePersBtnVisible: false
			}, "FilterPersonalization");
			if (!this.oFragmentList["Personalization"]) {
				Fragment.load({
					id: oView.getId(),
					name: this.formatter.getFragmentPath(sFragmentPath, "Personalization"),
					controller: this
				}).then(function (oDialog) {
					Promise.all([this.formatter.fetchFieldParameters.call(this)]).then(function (oRes) {
						this.oFragmentList["Personalization"] = oDialog;
						this.getView().addDependent(oDialog);
						this.oFragmentList["Personalization"].open();
					}.bind(this));
				}.bind(this)).catch(function (oErr) {});
			} else {
				this.oFragmentList["Personalization"].open();
			}
		},
		onPressFilterPersonalization: function (oEvent) {

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
			debugger;
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
			debugger;
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
			oView.setBusy(true);
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
				// var oItemBlockModel = oView.getModel("ItemBlockModel");
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
					this.oFragmentList[sFragmentName].open();
					this._resetSavedItem(sFragmentName);
					// oView.setBusy(false);
				}.bind(this));
			}.bind(this)).catch(function (oErrResp) {
				oView.setBusy(false);
				MessageBox.error("Failed to update to ECC");
			});
		},
		_resetSavedItem: function (sFragmentName) {
			var oItemBlockModel = this.getView().getModel("ItemBlockModel"),
				oInitialValueModel = this.getView().getModel("initialValueModel");

			debugger;
			// Reset to initial value
			if (this.onSaveEditItem["aResetChangesPath"].length > 0) {
				for (var index in this.onSaveEditItem["aResetChangesPath"]) {
					var sPath = this.onSaveEditItem["aResetChangesPath"][index];
					oItemBlockModel.setProperty(sPath, oInitialValueModel.getProperty(sPath));
				}
			}
			oItemBlockModel.setProperty(this.onSaveEditItem["sBindingPath"] + "/itemBtnEanbled", true);
			this.formatter.setCancelEditItem.call(this, oItemBlockModel, this.onSaveEditItem["aItems"]);
			this.getView().setBusy(false);
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
			}.bind(this)).catch(function (oErr) {
				var errMsg = JSON.parse(oErr.responseText).error.message.value;
				MessageBox.warning(errMsg);
				oView.setBusy(false);
			}.bind(this));
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
				}
			}.bind(this);

			MessageBox.show(
				["(", oTable.getSelectedItems().length, ")", " Item(s) approved and sent to next approval level"].join(""), {
					icon: MessageBox.Icon.INFORMATION,
					title: "Sales Document: " + oItem.requestId,
					actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
					onClose: fnCloseApprove,
					initialFocus: MessageBox.Action.CANCEL,
					styleClass: sResponsivePaddingClasses
				}
			);
		},
		onRejectPress: function (oEvent, sFragment, oItem) {
			var oView = this.getView(),
				oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				aRejectModel = [],
				oModel = this.getOwnerComponent().getModel(),
				sFragmentPath = this.getText("FragmentPath");

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
			Promise.all([this.formatter.fetchData.call(this, oModel, "/SearchHelp_RejectReasonSet")]).then(function (oRes) {
				if (!this.oFragmentList[sFragment]) {
					Fragment.load({
						id: oView.getId(),
						name: this.formatter.getFragmentPath(sFragmentPath, sFragment),
						controller: this
					}).then(function (oDialog) {
						this.oFragmentList[sFragment] = oDialog;
						oView.addDependent(oDialog);
						this.oFragmentList[sFragment].setModel(new JSONModel(oRes[0]), "ValueHelpSet");
						/*						this.oFragmentList[sFragment].setModel(new JSONModel(oRes[0]), "RejectDataModel");*/
						this.oFragmentList[sFragment].open();
						oView.setBusy(false);
					}.bind(this)).catch(function (oErr) {});
				} else {
					this.oFragmentList[sFragment].open();
					oView.setBusy(false);
				}
			}.bind(this)).catch(function (oErr) {
				var errMsg = JSON.parse(oErr.responseText).error.message.value;
				MessageBox.warning(errMsg);
				oView.setBusy(false);
			});
		},
		onOkRejectPress: function (oEvent, aItems, aSet) {
			var oView = this.getView(),
				oItemBlockModel = oView.getModel("ItemBlockModel");

			for (var index in aItems) {
				var oItem = aItems[index],
					sRejectText = sap.ui.getCore().byId(oItem.selectedId).getProperty("text");

				oItemBlockModel.setProperty([oItem.sPath, "/acceptOrReject"].join(""), "R");
				oItemBlockModel.setProperty([oItem.sPath, "/itemStagingStatus"].join(""), "Rejected");
				oItemBlockModel.setProperty([oItem.sPath, "/reasonForRejectionText"].join(""), sRejectText);
			}
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
			debugger;
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
			var oView = this.getView(),
				oSettingModel = oView.getModel("settings");

			oSettingModel.setProperty("/selectedPage", 1);
			this.formatter.fetchSaleOrder.call(this);
		},
		valueHelpRequest: function (oEvent, sFragment, sPath, sAccess, filter1) {
			var oView = this.getView(),
				oUserAccessModel = oView.getModel("UserAccess"),
				filter = [];

			if (!oUserAccessModel.getData()[sAccess] && (sAccess)) {
				MessageToast.show(this.getText("NoDataAccess"));
				return;
			}
			filter.push(new Filter("Language", FilterOperator.EQ, (sap.ui.getCore().getConfiguration().getLanguage() === "th") ? "2" : "EN"));
			if (sAccess) {
				filter.push(new Filter(filter1, FilterOperator.EQ, oUserAccessModel.getData()[sAccess]));
			}

			var aFilters = [],
				oFilter = new Filter({
					filters: filter,
					and: true
				}),
				oModel = this.getOwnerComponent().getModel(),
				sFragmentPath = this.getText("FragmentPath");

			this.valueHelpId = oEvent.getSource().getId();
			aFilters.push(oFilter);
			oView.setBusy(true);
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
						oView.setBusy(false);
						this.oFragmentList[sFragment].open();
					}.bind(this)).catch(function (oErrResp) {});
				}.bind(this)).catch(function (oErr) {
					oView().setBusy(false);
					var errMsg = JSON.parse(oErr.responseText).error.message.value;
					MessageBox.warning(errMsg);
				}.bind(this));
			} else {
				oView.setBusy(false);
				this.oFragmentList[sFragment].open();
			}
		},
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
		valueHelpRequestSoldToParty: function (oEvent, sFragment) {
			var oView = this.getView(),
				sFragmentPath = this.getText("FragmentPath");

			this.valueHelpId = oEvent.getSource().getId();
			if (!this.oFragmentList[sFragment]) {
				Fragment.load({
					id: oView.getId(),
					name: this.formatter.getFragmentPath(sFragmentPath, sFragment),
					controller: this
				}).then(function (oDialog) {
					this.oFragmentList[sFragment] = oDialog;
					oView.addDependent(oDialog);
					this.oFragmentList[sFragment].setModel(new JSONModel({
						"totalRecords": 0
					}), "SoldToPartyModel");
					this.oFragmentList[sFragment].open();
				}.bind(this)).catch(function (oErr) {});
			} else {
				this.oFragmentList[sFragment].open();
			}
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
			}.bind(this)).catch(function (oErr) {
				oTable.setBusy(false);
				var errMsg = JSON.parse(oErr.responseText).error.message.value;
				MessageBox.warning(errMsg);
			});
			/*			this._getSmartTable("idSoldToPartSmartTable").rebindTable();*/
		},
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
				oFilter = new Filter([
					new Filter(sFilter1, FilterOperator.Contains, value),
					new Filter(sFilter2, FilterOperator.Contains, value)
				]),
				oBinding = oEvent.getSource().getBinding("items");

			filters.push(oFilter);
			oBinding.filter(filters);
		},
		handleAdd: function (oEvent, sPath, sPathSoldToPart, sProperty) {
			var oView = this.getView(),
				selectedObj = oEvent.getParameters().selectedContexts[0].getObject(),
				oFilterModel = oView.getModel("filterModel");

			oEvent.getSource().getBinding("items").filter([]);
			if (!selectedObj) {
				return;
			}
			if (this.valueHelpId.includes("idSoldToPart")) {
				oFilterModel.setProperty(sPathSoldToPart, selectedObj[sProperty]);
			} else {
				oFilterModel.setProperty(sPath, selectedObj[sProperty]);
			}
		},
		handleAddItem: function (oEvent, sPathProperty, sProperty, sPathReset) {
			var oView = this.getView(),
				selectedObj = oEvent.getParameters().selectedContexts[0].getObject(),
				oItemBlockModel = oView.getModel("ItemBlockModel");

			if (this.sItemPath) {
				oItemBlockModel.setProperty(this.sItemPath + sPathProperty, selectedObj[sProperty]);
			}
			if (sProperty === "StorageLocation") {
				oItemBlockModel.setProperty(this.sItemPath + sPathReset, "");
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
			oView.setBusy(true);
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
			debugger;
			// Promise.all([this.formatter.createData.call(this, oDataModel, "/ValidateBeforeSubmitSet", aEntry)]).then(
			// 	function (oRes) {
			// 		debugger;

			// 		// if found the data in data in rontend is not sync with backend, prompt error.
			// 		/*					if (oRes[0].isChanged) {
			// 								if (!this.oFragmentList[sFragmentName]) {
			// 									this.oFragmentList[sFragmentName] = sap.ui.xmlfragment(this.getText("MainFragmentPath") + sFragmentName, this);
			// 									oView.addDependent(this.oFragmentList[sFragmentName]);
			// 								}
			// 								this.oFragmentList[sFragmentName].setModel(new JSONModel(oRes[0].navHeaderToValidateItem), "SubmitMessageModel");
			// 								this.oFragmentList[sFragmentName].open();
			// 								return;
			// 							}*/

			// 		// Trigger endpoint for submission
			// 		var sUrl = "/DKSHJavaService2/returnRequest/connect-onSubmitBlockOrderApproval"
			// 		this.formatter.postJavaService.call(this, oLoadDataModel, sUrl, oPayload).then(function (oJavaRes) {

			// 			debugger;
			// 		}.bind(this)).catch(function (oJavaErr) {
			// 			debugger;
			// 		}.bind(this));

			// 		oView.setBusy(false);
			// 	}.bind(this)).catch(function (oErr) {
			// 	debugger;
			// 	oView.setBusy(false);
			// 	var errMsg = JSON.parse(oErr.responseText).error.message.value;
			// 	MessageBox.warning(errMsg);
			// });
			var oReturnPromise = this.formatter.createData.call(this, oDataModel, "/ValidateBeforeSubmitSet", aEntry);
			oReturnPromise.then(function (oRes) {
				// if found the data in data from frontend is not sync with backend, prompt error.
				// if (oRes.isChanged) {
				// 	if (!this.oFragmentList[sFragmentName]) {
				// 		this.oFragmentList[sFragmentName] = sap.ui.xmlfragment(this.getText("MainFragmentPath") + sFragmentName, this);
				// 		oView.addDependent(this.oFragmentList[sFragmentName]);
				// 	}
				// 	this.oFragmentList[sFragmentName].setModel(new JSONModel(oRes.navHeaderToValidateItem), "SubmitMessageModel");
				// 	this.oFragmentList[sFragmentName].open();
				// 	return;
				// }

				// Trigger endpoint for submission
				var sUrl = "/DKSHJavaService/taskSubmit/processECCJobNew";
				this.formatter.postJavaService.call(this, oLoadDataModel, sUrl, JSON.stringify(this.aDetailItem)).then(function (oJavaRes) {
					MessageBox.information(this.getText("ItemSelectFilter"));
					// remove SO if success

					debugger;
					// Fetch the sale order 
					// Can remove the model for performance perspective
					this.formatter.fetchSaleOrder.call(this);
				}.bind(this)).catch(function (oJavaErr) {
					debugger;
					var errMsg = JSON.parse(oJavaErr.responseText).error.message.value;
					MessageBox.warning(errMsg);
					oView.setBusy(false);
				}.bind(this));
				oView.setBusy(false);
			}.bind(this)).catch(function (oErr) {
				debugger;
				oView.setBusy(false);
				var errMsg = JSON.parse(oErr.responseText).error.message.value;
				MessageBox.warning(errMsg);
			}.bind(this));

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
					}.bind(this)).catch(function (oErr) {
						var errMsg = JSON.parse(oErr.responseText).error.message.value;
						MessageBox.warning(errMsg);
					});
				}.bind(this));
			} else {
				Promise.all([this.formatter.fetchData.call(this, oModel, "/CreditStatusSet", aFilters)]).
				then(function (oRes) {
					this.oFragmentList["CreditBlockReasons"].openBy(oButton);
				}.bind(this)).catch(function (oErr) {
					var errMsg = JSON.parse(oErr.responseText).error.message.value;
					MessageBox.warning(errMsg);
				});
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
		onReset: function (oEvent) {
			var oFilterModel = this.getView().getModel("filterModel");

			oFilterModel.setData({});
			oFilterModel.updateBindings(true);
		},
		onResetSoldToParty: function (oEvent) {
			var oFilterModel = this.getView().getModel("filterModel");
			this.resetModel(oFilterModel, ["SoldToPartId", "SoldToPartName", "SoldToPartSaleOrg", "SoldToPartDivision", "SoldToPartDistChannel"]);
		},
		_refresh: function () {},
		_getSmartTable: function (sId) {
			return this.getView().byId(sId);
		},
		_getTable: function (sId) {
			return this.getView().byId(sId);
		}
	});

});