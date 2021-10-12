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
		},
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
		onPressPersonalization: function (oEvent) {
			this.getView().setModel({
				deletePersBtnVisible: false,
				savePersBtnVisible: false
			}, "FilterPersonalization");
			this._loadFragment("Personalization").bind(this);
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
			debugger;
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
			debugger;
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
			debugger;
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
				debugger;
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