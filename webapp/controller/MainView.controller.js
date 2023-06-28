sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"dksh/connectclient/itemblockorder/controller/EditableConfig"
], function (BaseController, JSONModel, Fragment, Sorter, Filter, FilterOperator, MessageBox, MessageToast, EditableConfig) {
	"use strict";
	var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";

	return BaseController.extend("dksh.connectclient.itemblockorder.controller.MainView", {
		onInit: function () {
			this._preSetModel(this.getView());
			this.oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this.oFragmentList = [];
			this._oEditableConfig = new EditableConfig(this.getOwnerComponent().getModel("Setup"));
			this.getView().setBusy(true);
			this.getView().setModel(new JSONModel({
				skipCount: 0,
				maxCount: 20,
				scrollLeftEnabled: false,
				scrollRightEnabled: false,
				firstPageEnabled: false,
				lastPageEnabled: false,
				pages: []
			}), "paginatedModel");
			var oPaging = new Promise(function (fnResolve) {
				var oPaginatedModel = this.getView().getModel("paginatedModel");
				var oPaginatedData = oPaginatedModel.getData();
				this._oEditableConfig.getGiven({
					module: "Fiori",
					settingName: "Item Release Order Pagination"
				}).then(function (aWhen) {
					this._oEditableConfig.runGWT(aWhen, oPaginatedData, false);
					fnResolve(oPaginatedData);
				}.bind(this))
			}.bind(this));
			Promise.all([this.formatter.fetchUserInfo.call(this), this.formatter.fetchData.call(this, this.getOwnerComponent().getModel(),
				"/GetControlEditableConfigSet"), oPaging]).then(function (oRes) {
				var oUserData = this.getView().getModel("UserInfo").getData();
				this.getView().setModel(new JSONModel(oRes[1].results), "ControlEditConfig");
				var fnReturnPayload = function (appId) {
					return {
						userId: oUserData.name,
						appId: appId,
						runType: "Web",
						emailId: oUserData.email
					};
				};
				Promise.all([
					this.formatter.postJavaService.call(this, this.getView().getModel("SearchHelpPersonalization"),
						this.getText("getVariant"), JSON.stringify(fnReturnPayload("keySearchReleaseBlock")), "POST"),
					this.formatter.postJavaService.call(this, this.getView().getModel("SoItemPersonalizationModel"),
						this.getText("getVariantRelease"), JSON.stringify(fnReturnPayload(
							"keyHeaderReleaseBlock@keyItemReleaseBlock")), "POST"),
					this.formatter.fetchSaleOrder.call(this)
				]).then(function (_oRes) {
					Object.assign(this.formatter.setNumericAndSort(_oRes[0], ["sequence"]), this._returnPersDefault());
					this.getView().getModel("SearchHelpPersonalization").refresh();
					Object.assign(_oRes[1], this._returnPersDefault());
					this.getView().setBusy(false);
				}.bind(this)).catch(function (oErr) {
					this._displayError(oErr);
				}.bind(this));
			}.bind(this)).catch(function (oErr) {
				this._displayError(oErr);
			}.bind(this));
			// get reject code - STRY0020007
			this._getSetupConfig();
		},
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
		onPressEditItem: function (oEvent, oModel, oItemModel) {
			var oView = this.getView(),
				oEditConfig = oView.getModel("ControlEditConfig").getData().find(function (oItem) {
					return oItem.orderType === oItemModel.orderType;
				});
			if (oEditConfig && oEditConfig.ViewOnly) {
				MessageToast.show(this.oResourceBundle.getText("OnlyViewMessage", [oItemModel.orderType]));
				return;
			}
			var oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				oItemBlockModel = oTable.getModel("ItemBlockModel"),
				aItems = oTable.getItems(),
				sPath = oTable.getBindingContext("ItemBlockModel").getPath(),
				aItemUsage = ["B", "C"];

			oSource.setVisible(false);
			// Control selected item's properties visibility
			var oCombination = {
				country: oItemModel.country ? oItemModel.country : oItemModel.salesOrg.substring(0, 2),
				module: "Fiori",
				settingName: "Item Release Order Editable"
			};
			var oPromise = this._oEditableConfig.getGiven(oCombination);
			oPromise.then(function (aGiven) {
				aItems.map(function (oItem) {
					var object = oItem.getBindingContext("ItemBlockModel").getObject();
					object = this.formatter.controlEditabled.call(this, object, aItems, aItemUsage, oEditConfig);
					object.country = oItemModel.country ? oItemModel.country : oItemModel.salesOrg.substring(0, 2);
					this._oEditableConfig.runGWT(aGiven, object, true);
					object.salesUnit = (!object.salesUnit) ? this.getText("UoM").toUpperCase() : object.salesUnit;
				}.bind(this));
				// Store initial value model for onSaveEditItem function
				// In case if item(s) are not valid then reset to initial value in onSaveEditItem or cancelEditItem function
				oView.setModel(new JSONModel(), "initialValueModel");
				oView.getModel("initialValueModel").setData(JSON.parse(oTable.getModel("ItemBlockModel").getJSON()));
				// Set edit button
				oItemBlockModel.setProperty(sPath + "/itemBtnEanbled", false);
				oItemBlockModel.refresh();
			}.bind(this));
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
				if (!oItem.sapMaterialNum) {
					MessageBox.warning("Make sure material is not blank");
					return;
				}
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
			this._getTable("idList").setBusy(true);
			// Validate if item has rejection or SO blocked prior update item to ECC
			Promise.all([this.formatter.fetchData.call(this, oModel, "/ValidateItemsBeforeSaveSet", aFilters)]).then(function (oRes) {
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
					this.onSaveEditItem["Payload"]), "POST").then(function (oResponse) {
					if (oLoadDataModel.getData().status === "FAILED") {
						this._displayError(oLoadDataModel.getData().message, "SaveFailedMessage");
						return;
					}
					this.oFragmentList[sFragmentName].open();
					this._resetSavedItem(sFragmentName);
				}.bind(this));
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
				MessageBox.warning("Make sure material is not blank");
				return;
			}
			this._getTable("idList").setBusy(true);
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
							oItemBlockModel.setProperty(sPath + "/" + sProperty, oItem[sProperty]);
						} else {
							oItemBlockModel.setProperty(sPath + "/" + sProperty, +oItem[sProperty]);
						}
					}
				}
				oItemBlockModel.refresh();
				this._getTable("idList").setBusy(false);
			}.bind(this)).catch(this._displayWarning.bind(this));
		},
		onApprovePress: function (oEvent, oItem) {
			var oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				oMessageModel = {
					results: []
				},
				//[+] add - STRY0019584
				vCountry = oItem.country ? oItem.country : oItem.salesOrg.substring(0, 2),
				aComCnfg = this._aCommCtrl.filter(function (oCode) {
					if (oCode.country === vCountry)
						return oCode;
				});
			//[+] end add - STRY0019584
			if (oTable.getSelectedItems().length === 0) {
				MessageToast.show(this.getText("ItemSelectList"));
				return;
			}
			this.onApprovePress["Table"] = oTable;
			oMessageModel["Title"] = this.oResourceBundle.getText("TitleMessageBox", [oItem.salesOrderNum]);
			for (var indx in oTable.getSelectedContexts()) {
				var oSelectedContext = oTable.getSelectedContexts()[indx];
				//[-] delete - STRY0019584
				//	var sMessage = (!oSelectedContext.getObject().nextLevel) ? this.oResourceBundle.getText("FinalApprovalMessage", [oSelectedContext.getObject()
				//		.salesItemOrderNo
				//	]) : this.oResourceBundle.getText("ApprovalMessage", [oSelectedContext.getObject().salesItemOrderNo]);
				//	oMessageModel.results.push({
				//		Message: sMessage
				//	});
				//[-] end delete - STRY0019584	
				//[+] add - STRY0019584
				oMessageModel["mainText"] = "";
				var oContext = oSelectedContext.getObject(),
					sMessage = (!oSelectedContext.getObject().nextLevel) ? this.oResourceBundle.getText("FinalApprovalMessage", [oSelectedContext.getObject()
						.salesItemOrderNo
					]) : this.oResourceBundle.getText("ApprovalMessage", [oSelectedContext.getObject().salesItemOrderNo]),
					aCheck = aComCnfg.find(function (oComCnfg) {
						if (oContext.materialGroup) {
							if (oComCnfg.name === "materialGroup") {
								if (oComCnfg.value === oContext.materialGroup)
									return oComCnfg;
							}
						}
						if (oContext.materialGroup4) {
							if (oComCnfg.name === "materialGroup4") {
								if (oComCnfg.value === oContext.materialGroup4)
									return oComCnfg;
							}
						}
					});
				oMessageModel.results.push({
					itemNo: oContext.salesItemOrderNo,
					Message: sMessage,
					matGrp: oContext.materialGroup,
					matGrp4: oContext.materialGroup4,
					comments: oContext.comments,
					placeHolder: (aCheck) ? this.oResourceBundle.getText("requiredComment") : this.oResourceBundle.getText("apvComment"),
					required: (aCheck) ? true : false
				});
				//[+] end add - STRY0019584 - 
			}
			this.getView().setModel(new JSONModel(oMessageModel), "MessageModel");
			this._loadXMLFragment(this.getText("MainFragmentPath"), "DialogMessageBox", oMessageModel, "MessageModel").bind(this);
		},
		//[+] add - STRY0019584
		onAddApproveComments: function (oEvent, aItems) {
			var oVal = oEvent.getParameter("value");
			for (var i in aItems) {
				aItems[i].comments = oVal;
			}
		},
		//[+] end add - STRY0019584
		onOkMessageBox: function (oEvent, sFragment) {
			var oTable = this.onApprovePress["Table"],
				//[+] add - STRY0019584
				aMsgData = this.getView().getModel("MessageModel").getData().results,
				aComChk = aMsgData.find(function (oMsg) {
					if (oMsg.required) {
						if (!oMsg.comments)
							return oMsg;
					}
				});

			if (aComChk) {
				MessageToast.show(this.oResourceBundle.getText("noApprovalComment"));
				return;
			}
			//[+] end add - STRY0019584 [sPath, "/acceptOrReject"].join("")
			for (var index in oTable.getSelectedContexts()) {
				var oSelectedContext = oTable.getSelectedContexts()[index],
					sPath = oSelectedContext.getPath();

				oSelectedContext.getModel().setProperty([sPath, "/acceptOrReject"].join(""), "A");
				oSelectedContext.getModel().setProperty([sPath, "/itemStagingStatus"].join(""), "Pending Submission");
				// Set both comment and reject reason text to blank for user action
				oSelectedContext.getModel().setProperty([sPath, "/reasonForRejectionText"].join(""), "");
				//[-] delete - STRY0019584
				// 	oSelectedContext.getModel().setProperty([sPath, "/comments"].join(""), "");
				//[-] end delete - STRY0019584
				//[+] add - STRY0019584
				var vOrdLine = oSelectedContext.getModel().getProperty([sPath, "/salesItemOrderNo"].join("")),
					oApprove = aMsgData.find(function (oMsg) {
						if (oMsg.itemNo === vOrdLine)
							return oMsg;
					});
				oSelectedContext.getModel().setProperty([sPath, "/comments"].join(""), oApprove.comments);
				//[+] end add - STRY0019584
			}
			oTable.removeSelections();
			this.handleCloseValueHelp(oEvent, sFragment);
		},
		//[+] get rejection code setting - STRY0020007
		_getSetupConfig: function () {
			this._aRejCode = [];
			var oParam = {
					module: "Fiori",
					settingName: "itemReleaseOrder",
					grouping: "rejectCode"
				},
				fnGetData = function (oRow, i) {
					this._aRejCode.push({
						country: oRow.country,
						value: oRow.value
					});
				}.bind(this);
			var oPromise = this._oEditableConfig.getGiven(oParam);
			oPromise
				.then(function (aRet) {
					aRet.forEach(function (aRow, iIdx) {
						aRow.then.results.forEach(fnGetData);
					});
				})
				.finally(function () {
					this._getCommentCtrl();
				}.bind(this));
		},
		//[+] end add - STRY0020007
		//[+] add - STRY0019584
		_getCommentCtrl: function () {
			//	this._valState = sap.ui.core.ValueState;
			this._aCommCtrl = [];
			var oParam = {
					module: "Fiori",
					settingName: "itemReleaseOrderApv",
					grouping: "commentControl"
				},
				fnGetData = function (oRow, i) {
					this._aCommCtrl.push({
						country: oRow.country,
						name: oRow.name,
						value: oRow.value
					});
				}.bind(this);
			var oPromise = this._oEditableConfig.getGiven(oParam);
			oPromise.then(function (aRet) {
				aRet.forEach(function (aRow, iIdx) {
					aRow.then.results.forEach(fnGetData);
				});
			});
		},
		//[+] end add - STRY0019584
		onRejectPress: function (oEvent, sFragment, oItem, oModel) {
			var oView = this.getView(),
				oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId),
				aRejectModel = [],
				//[+] add - STRY0020007
				oDataModel = oView.getModel(),
				vCountry = oItem.country ? oItem.country : oItem.salesOrg.substring(0, 2),
				aReject = this._aRejCode.filter(function (oCode) {
					if (oCode.country === vCountry)
						return oCode;
				}),
				aFilter = aReject ? aReject.map(function (oVal) {
					return new Filter("RejCode", FilterOperator.EQ, oVal.value);
				}) : [];
			//[+] end add - STRY0020007

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
			//[+] add - STRY0020007
			oDataModel.read("/SearchHelp_RejectReasonSet", {
				async: false,
				filters: aFilter,
				sorters: [new sap.ui.model.Sorter("RejCode", false)],
				success: function (oData, oResponse) {
					oView.setModel(new JSONModel(oData.results), "RejectF4Model");
				},
				error: function (error) {
					MessageToast.show(error);
				}
			});
			//[+] end add - STRY0020007
			oView.setModel(new JSONModel(aRejectModel), "RejectDataModel");
			oView.setBusy(true);
			this.onRejectPress["Table"] = oTable;
			if (!this.oFragmentList[sFragment]) {
				this._loadFragment(this.getText("FragmentPath"), sFragment);
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
		onItemTableFreeSearch: function (oEvent, oModel) {
			var sValue = oEvent.getParameters().newValue,
				// Can't get ID by view since each panel ID is generated dynamically from control itself
				// In this case, have to use sap.ui.core() to get the object of the sId
				sId = oEvent.getSource().getParent().getParent().getId(),
				oBinding = sap.ui.getCore().byId(sId).getBinding("items"),
				aFilters = [];

			if (!oEvent.getParameters().clearButtonPressed && sValue) {
				var oFilterString = new Filter({
						filters: this.setBindingFilter(["salesItemOrderNo", "shortText", "sapMaterialNum", "salesUnit", "netPrice", "splPrice",
								"netWorth", "storageLoc", "batchNum", "materialGroup", "disc1", "disc2", "disc3", "disc4",
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
			this._loadXMLFragment(this.getText("MainFragmentPath"), sFragmentName, oItemModel, "DisplayActionModel").bind(this);
		},
		onResetDisplay: function (oEvent) {
			var oSource = oEvent.getSource(),
				sId = oSource.getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId);

			if (oTable.getSelectedItems().length === 0) {
				return;
			}
			var aSelectedContext = oTable.getSelectedContexts();
			oTable.removeSelections();
			aSelectedContext.map(function (oContexts) {
				var sPath = oContexts.getPath(),
					oContextModel = oContexts.getModel();
				if (oContexts.getProperty([sPath, "/acceptOrReject"].join(""))) {
					oContextModel.setProperty(sPath + "/acceptOrReject", null);
					oContextModel.setProperty(sPath + "/itemStagingStatus", this.getText("PendingApproval"));
				}
			}.bind(this));
			oTable.getModel().updateBindings(false);
		},
		onSearchSalesHeader: function (oEvent, oFilterSaleOrder) {
			var oPaginatedModel = this.getView().getModel("paginatedModel");
			var oPaginatedData = oPaginatedModel.getData();
			oPaginatedData.skipCount = 0;
			this.formatter.fetchSaleOrder.call(this).then(function (oRes) {
				this.getView().setBusy(false);
			}.bind(this));
		},
		onScrollLeft: function (oEvent) {
			var oPaginatedModel = this.getView().getModel("paginatedModel");
			var oPaginatedData = oPaginatedModel.getData();
			oPaginatedData.skipCount = oPaginatedData.skipCount < oPaginatedData.maxCount ? 0 : oPaginatedData.skipCount - oPaginatedData.maxCount;
			this.formatter.fetchSaleOrder.call(this).then(function (oRes) {
				oPaginatedModel.refresh();
				this.getView().setBusy(false);
			}.bind(this));
		},
		onScrollRight: function (oEvent) {
			var oPaginatedModel = this.getView().getModel("paginatedModel");
			var oPaginatedData = oPaginatedModel.getData();
			oPaginatedData.skipCount = oPaginatedData.skipCount + oPaginatedData.maxCount;
			this.formatter.fetchSaleOrder.call(this).then(function (oRes) {
				oPaginatedModel.refresh();
				this.getView().setBusy(false);
			}.bind(this));
		},
		onFirstPage: function (oEvent) {
			var oPaginatedModel = this.getView().getModel("paginatedModel");
			var oPaginatedData = oPaginatedModel.getData();
			oPaginatedData.skipCount = 0;
			this.formatter.fetchSaleOrder.call(this).then(function (oRes) {
				oPaginatedModel.refresh();
				this.getView().setBusy(false);
			}.bind(this));
		},
		onPageClick: function (oEvent) {
			var oPaginatedModel = this.getView().getModel("paginatedModel");
			var oPaginatedData = oPaginatedModel.getData();
			var sText = oEvent.getSource().getProperty("text");
			oPaginatedData.skipCount = (parseInt(sText) - 1) * oPaginatedData.maxCount;
			this.formatter.fetchSaleOrder.call(this).then(function (oRes) {
				this.getView().setBusy(false);
			}.bind(this));
		},
		onLastPage: function (oEvent) {
			var oPaginatedModel = this.getView().getModel("paginatedModel");
			var oPaginatedData = oPaginatedModel.getData();
			var oViewModel = this.getView().getModel("ItemBlockModel");
			var oViewData = oViewModel.getData();
			oPaginatedData.skipCount = (Math.floor(oViewData.count / oPaginatedData.maxCount) - 1 + (oViewData.count % oPaginatedData.maxCount ?
				1 : 0)) * oPaginatedData.maxCount;
			this.formatter.fetchSaleOrder.call(this).then(function (oRes) {
				oPaginatedModel.refresh();
				this.getView().setBusy(false);
			}.bind(this));
		},
		valueHelpRequest: function (oEvent, sFragment, sField, sAccess, bCheckAccess) {
			var oUserAccessModel = this.getView().getModel("UserAccess"),
				aItemVH = ["StorageLocation", "BatchNo"],
				aClearFragment = ["SoldToParty"],
				aValue = [];

			if (!oUserAccessModel.getData()[sAccess] && (sAccess) && bCheckAccess) {
				MessageToast.show(this.getText("NoDataAccess"));
				return;
			}
			this.valueHelpId = oEvent.getSource().getId();
			this.vhFilter = "";
			var sIAccess = oUserAccessModel.getData()[sAccess];
			if (sIAccess) {
				aValue = (sIAccess !== "*") ? sIAccess.split("@") : [];
			}
			if (aValue.length > 0) {
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
			this._loadFragment(this.getText("FragmentPath"), sFragment, oEvent);
		},
		onSearchSoldToParty: function (oEvent, sFragment, sId) {
			this._setBindFilterStp(sId);
			if (!this.oFragmentList[sFragment]) {
				this.oFragmentList[sFragment].setModel(new JSONModel({}), "SoldToPartyModel");
			} else {
				var oSoldToPartyModel = this.oFragmentList[sFragment].getModel("SoldToPartyModel");
				oSoldToPartyModel.setProperty("/totalRecords", oSoldToPartyModel.getProperty("/totalRecords"));
			}
		},
		onLiveSearchSoldToParty: function (oEvent, sId) {
			var sValue = oEvent.getParameters().newValue;
			var oFilterData = this.getView().getModel("filterModel").getData(),
				bCheck = true;

			if (!oFilterData.stp_id && !oFilterData.stp_name && !oFilterData.stp_soldorg && !oFilterData.stp_division && !oFilterData.stp_distchnl) {
				bCheck = false;
			}
			if (!oEvent.getParameters().clearButtonPressed && sValue && bCheck) {
				this._setBindFilterStp(sId, sValue);
				return;
			}
			if (bCheck) {
				this._setBindFilterStp(sId);
			}
		},
		onResetSoldToParty: function (oEvent) {
			var oFilterModel = this.getView().getModel("filterModel");
			this.resetModel(oFilterModel, ["stp_id", "stp_name", "stp_soldorg", "stp_division", "stp_distchnl"]);
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
		onLiveChange: function (oEvent, sCode, sDescription) {
			var value = oEvent.getParameters().value,
				oBinding = oEvent.getSource().getBinding("items"),
				aFilter = [];
			if (this.vhFilter) {
				aFilter.push(new Filter({
					filters: this.vhFilter.aFilters.map(function (obj) {
						return obj;
					}),
					and: false
				}));
			}
			if (value) {
				aFilter.push(new Filter({
					filters: [new Filter(sCode, FilterOperator.Contains, value), new Filter(sDescription, FilterOperator.Contains, value)],
					and: false
				}));
			}
			oBinding.filter(new Filter(aFilter, true));
		},
		handleAdd: function (oEvent, sPath, sProperty, sBindModel, sPathReset, sPathSoldParty) {
			var selectedObj = oEvent.getParameters().selectedContexts[0].getObject(),
				oModel = this.getView().getModel(sBindModel),
				sPathM = (this.valueHelpId.includes("idstp")) ? sPathSoldParty : sPath;

			oModel.setProperty(sPathM, selectedObj[sProperty]);
			// Need to enhacne next time
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
		onItemSubmission: function (oEvent, aItem, sSubmitFragment, sSavedMessageFragment) {
			var oView = this.getView(),
				sId = oEvent.getSource().getParent().getParent().getId(),
				oTable = sap.ui.getCore().byId(sId);

			if (oTable.getSelectedItems().length === 0) {
				MessageToast.show(this.getText("ItemSelectList"));
				return;
			}
			var oDataModel = oView.getModel(),
				oLoadDataModel = oView.getModel("LoadDataModel"),
				aEntry = {
					navHeaderToValidateItem: []
				},
				aPayloadItem = {},
				aItemList = [],
				aErrResults = [],
				aMessageModel = {
					results: []
				},
				aDataProperties = ["salesItemOrderNo", "salesHeaderNo", "sapMaterialNum", "orderedQtySales", "netPrice", "storageLoc", "batchNum"];

			Object.assign(aEntry, {
				salesHeaderNo: aItem.salesOrderNum
			});
			for (var index in oTable.getSelectedContexts()) {
				var oSelectedContext = oTable.getSelectedContexts()[index],
					sPath = oSelectedContext.getPath(),
					oItem = oSelectedContext.getProperty(sPath),
					oEntry = {};

				if (!oItem.acceptOrReject) {
					aErrResults.push({
						salesItemOrderNo: oItem.salesItemOrderNo,
						Message: this.oResourceBundle.getText("noActionTakenItem", [oItem.salesItemOrderNo])
					});
					continue;
				}
				if (oItem.higherLevelItem === "000000") {
					var aReturn = this._validateBonusAction(oItem, aItem, oTable, "salesItemOrderNo", "higherLevelItem");
					if (aReturn && !aReturn[0]) {
						aErrResults.push(aReturn[1]);
						continue;
					}
				}
				if (oItem.higherLevelItem !== "000000" && oItem.acceptOrReject !== "R") {
					aReturn = this._validateBonusAction(oItem, aItem, oTable, "higherLevelItem", "salesItemOrderNo");
					if (aReturn && !aReturn[0]) {
						aErrResults.push(aReturn[1]);
						continue;
					}
				}
				for (index in Object.keys(aDataProperties)) {
					var sDataProperty = aDataProperties[index];
					oEntry[sDataProperty] = oItem[sDataProperty].toString();
				}
				aEntry.navHeaderToValidateItem.push(oEntry);
				aItemList.push(oItem);
			}
			if (aErrResults.length > 0) {
				aMessageModel.results = aErrResults.filter(function (obj, idx) {
					return !aErrResults.map(function (map) {
						return map.salesItemOrderNo;
					}).includes(obj.salesItemOrderNo, idx + 1);
				});
				this._loadXMLFragment(this.getText("MainFragmentPath"), sSavedMessageFragment, aMessageModel, "SavedMessageModel").bind(this);
				return;
			}
			Object.assign(aPayloadItem, aItem);
			aPayloadItem.salesDocItemList = aItemList;
			this._getTable("idList").setBusy(true);
			// Use create is easy to structure for deep entries
			Promise.all([this.formatter.createData.call(this, oDataModel, "/ValidateBeforeSubmitSet", aEntry)]).then(function (oRes) {
				// if found the data from frontend is not sync with backend, prompt error.
				if (oRes[0].isChanged) {
					this._getTable("idList").setBusy(false);
					this._loadXMLFragment(this.getText("MainFragmentPath"), sSubmitFragment, oRes[0].navHeaderToValidateItem,
						"SubmitMessageModel");
					return;
				}
				// Trigger submission endpoint
				var sUrl = "/DKSHJavaService/taskSubmit/processECCJobNew";
				this.formatter.postJavaService.call(this, oLoadDataModel, sUrl, JSON.stringify(aPayloadItem), "POST").then(function (oJavaRes) {
					// Fetch the sale order 
					if (oLoadDataModel.getData().status === "FAILED") {
						this._displayError(oLoadDataModel.getData().message, "SubmitFailedMessage").bind(this);
						return;
					}
					var fnCloseApprove = function (oAction) {
						if (oAction === "OK") {
							this._getTable("idList").setBusy(false);
							this.formatter.fetchSaleOrder.call(this).then(function (_oRes) {
								oTable.removeSelections();
								this.getView().setBusy(false);
							}.bind(this));
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
				}.bind(this)).catch(function (oErr) {
					this._displayError(oErr);
				}.bind(this));
			}.bind(this)).catch(function (oErr) {
				this._displayWarning(oErr);
			}.bind(this));
		},
		handleCreditBlockPress: function (oEvent, sOrderNum) {
			var oButton = oEvent.getSource(),
				sFragmentPath = this.getText("MainFragmentPath"),
				oView = this.getView(),
				oModel = this.getOwnerComponent().getModel(),
				aFilters = [];

			var oFilter = new Filter({
				filters: [new Filter("salesOrderNum", FilterOperator.EQ, sOrderNum)],
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
					this.oFragmentList["CreditBlockReasons"].setModel(new JSONModel(oRes[0]), "CreditBlockReasonsModel");
					this.oFragmentList["CreditBlockReasons"].openBy(oButton);
				}.bind(this)).catch(this._displayWarning.bind(this));
			}
		},
		onUpdateFinished: function (oEvent, sFragment) {
			if (this.oFragmentList[sFragment]) {
				this.oFragmentList[sFragment].getModel("SoldToPartyModel").setProperty("/totalRecords", oEvent.getParameter("total"));
			}
		},
		onSubmitSoldtoParty: function (oEvent) {
			var oTable = this._getTable("idSTPTable"),
				oFilterModel = this.getView().getModel("filterModel"),
				sPath = oTable.getSelectedContextPaths()[0],
				oItem = oTable.getModel().getProperty(sPath);

			oFilterModel.setProperty("/soldtoParty", oItem.stp_id);
			oFilterModel.setProperty("/distChannel", oItem.stp_distchnl);
			oFilterModel.setProperty("/division", oItem.stp_division);
			oFilterModel.setProperty("/salesOrg", oItem.stp_soldorg);
			this.handleCancel(oEvent, "SoldToParty");
		},
		onPressPersonalization: function (oEvent, sFragmentName, sModel) {
			this.getView().setModel(new JSONModel(JSON.parse(this.getView().getModel(sModel).getJSON())), "initialValueModel");
			this._loadXMLFragment(this.getText("MainFragmentPath"), sFragmentName, this.getView().getModel(sModel), sModel).bind(this);
		},
		onPresBtnShVariant: function (oEvent, sFragmentName, oModel, sModelName, sAction, isItemPers) {
			if (sAction === "Create") {
				if (isItemPers) {
					this._setPersCreationSetting(oModel.getData().header.userPersonaDto);
					this._setPersCreationSetting(oModel.getData().item.userPersonaDto);
				} else {
					this._setPersCreationSetting(oModel.getData().userPersonaDto);
				}
				var aSet = ["isSetCreatable", "isBtnVisible", "isListEnabled"];
				for (var index in aSet) {
					var oSet = aSet[index];
					oModel.setProperty("/" + oSet, !oModel.getData()[oSet]);
				}
			} else if (sAction === "Cancel") {
				var oInitialData = JSON.parse(JSON.stringify(this.getView().getModel("initialValueModel").getData()));
				oModel.setData(oInitialData, this._returnPersDefault());
			} else if (sAction === "Edit") {
				aSet = ["isBtnVisible", "isDelBtnVisible", "isListEnabled", "isEdit"];
				for (index in aSet) {
					oSet = aSet[index];
					oModel.setProperty("/" + oSet, !oModel.getData()[oSet]);
				}
			}
			this.oFragmentList[sFragmentName].getModel(sModelName).refresh();
		},
		onChangeVariant: function (oEvent, oModel, sModel, sFragmentName) {
			var oUserData = this.getView().getModel("UserInfo").getData(),
				sVariantUrl = (sFragmentName === "SearchHelpPersonalization") ? "variantListUrl" : "variantReleaseListUrl",
				sUrl = this.oResourceBundle.getText(sVariantUrl, [oUserData.name, (oEvent) ? oEvent.getParameters().selectedItem.getKey() :
					"Default"
				]);
			this.callJavaServicePersonalization(oModel, sModel, "CHANGE", null, sUrl, sFragmentName);
		},
		onVariantUpdate: function (oEvent, oModel, sModel, sAction, sFragmentName, isItemPers) {
			var oUserData = this.getView().getModel("UserInfo").getData();
			if (!oModel.getData().newVariant && !oModel.getData().isEdit) {
				oModel.setProperty("/valueState", "Error");
				this.oFragmentList[sFragmentName].getModel(sModel).refresh();
				return;
			}
			var sVariant = (oModel.getData().isEdit) ? oModel.getData().currentVariant : oModel.getData().newVariant;
			oModel.setProperty("/valueState", "None");
			var oPayload = (isItemPers) ? this._returnItemVarPayload(oModel, oUserData, sVariant) : this._returnShVarPayload(oModel, oUserData,
					"keySearchReleaseBlock", sVariant),
				sUrl = (isItemPers) ? this.getText("updateVariantRelease") : this.getText("updateVariant");
			this.callJavaServicePersonalization(oModel, sModel, sAction, JSON.stringify(oPayload), sUrl, sFragmentName);
		},
		onVariantDelete: function (oEvent, oModel, sModel, sAction, sFragmentName, isItemPers) {
			var fnClose = function (oAction) {
				if (oAction === "CANCEL") {
					return;
				}
				var oUserData = this.getView().getModel("UserInfo").getData(),
					oPayload = (isItemPers) ? this._returnItemVarPayload(oModel, oUserData, oModel.getData().currentVariant) : this._returnShVarPayload(
						oModel, oUserData, "keySearchReleaseBlock", oModel.getData().currentVariant),
					sUrl = (isItemPers) ? this.getText("deleteVariantRelease") : this.getText("deleteVariant");
				this.callJavaServicePersonalization(oModel, sModel, sAction, JSON.stringify(oPayload), sUrl, sFragmentName);
			}.bind(this);
			MessageBox.show(this.oResourceBundle.getText("variantDeleteMsg", [oModel.getData().currentVariant]), {
				icon: MessageBox.Icon.INFORMATION,
				title: "Confirmation",
				actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
				onClose: fnClose,
				initialFocus: MessageBox.Action.CANCEL,
				styleClass: sResponsivePaddingClasses
			});
		},
		callJavaServicePersonalization: function (oModel, sModel, sAction, oPayload, sUrl, sFragmentName) {
			var sMethod = (sAction === "SAVE") ? "PUT" : (sAction === "DELETE") ? "DELETE" : "POST";
			this.getView().setBusy(true);
			this.formatter.postJavaService.call(this, this.getView().getModel("LoadDataModel"), sUrl, oPayload, sMethod).then(function (_oRes) {
				if (sMethod === "DELETE") {
					oModel.setData(Object.assign(oModel.getData(), this._returnPersDefault()));
					oModel.getData().variantName.splice(oModel.getData().variantName.findIndex(function (item) {
						return item.name === oModel.getData().currentVariant;
					}), 1);
					this.onChangeVariant(null, oModel, sModel, sFragmentName);
					return;
				}
				if (sMethod === "PUT") {
					if (oModel.getData().newVariant) {
						oModel.getData()["variantName"].push({
							name: oModel.getData().newVariant
						});
					}
					oModel.setData(Object.assign(oModel.getData(), this._returnPersDefault()));
				}
				if (sFragmentName === "SearchHelpPersonalization") {
					oModel.setProperty("/currentVariant", _oRes.userPersonaDto[0].variantId);
					oModel.setProperty("/userPersonaDto", this.formatter.setNumericAndSort(_oRes, ["sequence"]).userPersonaDto);
				} else {
					oModel.setProperty("/currentVariant", _oRes.header.userPersonaDto[0].variantId);
					oModel.setProperty("/header/userPersonaDto", _oRes.header.userPersonaDto);
					oModel.setProperty("/item/userPersonaDto", _oRes.item.userPersonaDto);
				}
				var oInitialData = JSON.parse(JSON.stringify(oModel.getData()));
				this.getView().getModel("initialValueModel").setData(oInitialData);
				this.oFragmentList[sFragmentName].getModel(sModel).refresh();
				this.getView().setBusy(false);
			}.bind(this)).catch(function (oErr) {
				this._displayError(oErr);
			}.bind(this));
		},
		onAfterClose: function (oEvent, oModel, sModelName, sFragmentName) {
			this.onPresBtnShVariant(oEvent, sFragmentName, oModel, sModelName, "Cancel", false);
		},
		onPressRefresh: function () {
			this.formatter.fetchSaleOrder.call(this).then(function () {
				this.getView().setBusy(false);
			}.bind(this));
		},
		onReset: function (oEvent) {
			var oFilterModel = this.getView().getModel("filterModel");
			oFilterModel.setData({});
			oFilterModel.updateBindings(true);
		},
		/** 
		 * Destroy controller and dependent objects
		 */
		destroy: function () {
			if (this._oEditableConfig)
				this._oEditableConfig.destroy();
			BaseController.prototype.destroy.apply(this, arguments);
		}
	});
});