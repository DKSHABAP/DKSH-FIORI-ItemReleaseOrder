sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/message/MessageManager"
], function (JSONModel, MessageBox, MessageToast, MessageManager) {
	"use strict";

	var oHeader = {
		"Content-Type": "application/json;charset=utf-8"
	};
	return {
		getFragmentPath: function (sFragmentPath, sFragmentName) {
			return sFragmentPath + sFragmentName;
		},
		fetchData: function (oModel, sPath, aFilters, aParams, groupId) {
			return new Promise(
				function (resolve, reject) {
					oModel.read(sPath, {
						filters: aFilters,
						urlParameters: aParams,
						groupId: groupId,
						success: function (oData, oResponse) {
							resolve(oData);
						}.bind(this),
						error: function (error) {
							reject(error);
						}.bind(this)
					});
				});
		},
		createData: function (oModel, sPath, oEntry) {
			return new Promise(function (resolve, reject) {
				oModel.create(sPath, oEntry, {
					success: function (oData, oResponse) {
						resolve(oData);
					},
					error: function (error) {
						reject(error);
					}
				});
			});
		},
		fetchUserInfo: function () {
			var oView = this.getView();
			return new Promise(
				function (resolve, reject) {
					oView.getModel("UserInfo").loadData("/services/userapi/currentUser").then(function () {
						var oUserInfoModel = oView.getModel("UserInfo"),
							oUserAccessModel = oView.getModel("UserAccess");

						oUserAccessModel.loadData("/DKSHJavaService2/userDetails/findAllRightsForUserInDomain/" + oUserInfoModel.getData().name +
								"&cc")
							.then(function (oUserAccessResp) {}).catch(function (oErr) {
								reject(oErr);
							});
						oView.getModel("UserManagement").loadData("/UserManagement/service/scim/Users/" + oUserInfoModel.getProperty(
							"/name")).then(function (oUserMgtRes) {
							resolve(oUserMgtRes);
						}.bind(this)).catch(function (oErr) {
							reject(oErr);
						});
					}.bind(this)).catch(function (oErr) {
						reject(oErr);
					});
				}.bind(this)
			);
		},
		fetchSaleOrder: function () {
			var oUserInfoModel = this.getView().getModel("UserInfo"),
				oUserMangement = this.getView().getModel("UserManagement"),
				oFilterSaleOrder = this.getView().getModel("filterModel").getData(),
				aProperties = ["isAdmin", "materialGroup", "materialCode", "materialGroup4", "salesOrg", "soldtoParty",
					"division", "distChannel", "salesTeam", "salesTerritory", "endDate", "initialDate", "customerPoNo", "shipToparty",
					"salesDocNumInitial", "salesDocNumEnd", "headerDeliveryBlock", "itemDeliveryBlock", "orderType"
				],
				oReqPayload = {
					filter: {}
				};
			for (var index in Object.keys(aProperties)) {
				var sProperty = aProperties[index];
				if ((sProperty === "endDate" || sProperty === "initialDate")) {
					var dDate = oFilterSaleOrder[sProperty];
					oReqPayload["filter"][sProperty] = (dDate) ? dDate.getFullYear() + '/' + ('0' + (dDate.getMonth() + 1)).slice(-2) + '/' + ('0' +
						dDate.getDate()).slice(-
						2) : '';
					continue;
				}
				oReqPayload["filter"][sProperty] = oFilterSaleOrder[sProperty];
			}
			Object.assign(oReqPayload, {
				currentUserInfo: {
					taskOwner: oUserInfoModel.getProperty("/name"),
					userId: oUserInfoModel.getProperty("/name")
				},
				isForItem: true
			});
			this.getView().setBusy(true);
			var sUrl = "/DKSHJavaService/taskSubmit/getSalesBlockOrder/";
			this.getView().getModel("ItemBlockModel").loadData(sUrl, JSON.stringify(oReqPayload), true, "POST", false, false, oHeader).then(
					function (oRes) {
						var oData = this.getView().getModel("ItemBlockModel").getData();
						oUserMangement = this.getView().getModel("UserManagement");

						// No data found
						if (oData.data.length === 0 || !oData) {
							this.getView().setBusy(false);
							return;
						}
						//debugger;
						this.getView().getModel("ItemBlockModel").setProperty("/count", oData.data.length);
						oData.data.map(function (data) {
							data.creationDate = new Date(data.salesOrderDateTxt);
							Object.assign(data, {
								loggedInUserPid: oUserMangement.getData().id,
								loggedInUserId: oUserMangement.getData().userName,
								expanded: false,
								itemBtnEanbled: true,
								submitForHeader: false
							});
						}.bind(this));
						this.getView().getModel("ItemBlockModel").refresh();
						this.getView().setBusy(false);
					}.bind(this))
				.catch(function (oErr) {
					this.getView().setBusy(false);
				}.bind(this));
		},
		postJavaService: function (Model, sUrl, oPayload) {
			return new Promise(
				function (resolve, reject) {
					Model.loadData(sUrl, oPayload, true, "POST", false, false, oHeader)
						.then(
							function (oRes) {
								resolve(oRes);
							}.bind(this)).catch(function (oErr) {
							reject(oErr);
						}.bind(this));
				});
		},
		setCancelEditItem: function (oItemBlockModel, aItems) {
			if (aItems.length > 0) {
				// Control selected item's properties visibility
				for (var indx in aItems) {
					var object = aItems[indx].getBindingContext("ItemBlockModel").getObject();
					object.editMaterial = false;
					object.editOrderQty = false;
					object.editNetPrice = false;
					object.editSLoc = false;
					object.editBatchNo = false;
				}
				oItemBlockModel.refresh();
			}
		},
		fetchFieldParameters: function () {
			var sUrl = "/WorkboxServices/users/getFieldParameters/approvalworkflow",
				oView = this.getView(),
				oLoadModel = oView.getModel("LoadDataModel");

			return new Promise(
				function (resolve, reject) {
					oLoadModel.loadData(sUrl, null, !0);
					oLoadModel.attachRequestCompleted(function (oResp) {
						var itemLevelPersData = oResp.getSource().getData().data;
						if (!itemLevelPersData) {
							return;
						}
						var customItem = {
							"header": [],
							"item": []
						};
						for (var index in itemLevelPersData) {
							if (itemLevelPersData[index].level === "HEADER") {
								customItem.header.push(JSON.parse(JSON.stringify(itemLevelPersData[index])));
							} else {
								customItem.item.push(JSON.parse(JSON.stringify(itemLevelPersData[index])));
							}
						}
						oView.setModel(new JSONModel(customItem), "PersonalizationModel");
						resolve(oResp);
					}.bind(this));
					oLoadModel.attachRequestFailed(function (oErr) {
						reject(oErr);
					});
				});
		},
		controlEditabled: function (object, bBonus, aItemUsage) {
			// Default
			object.editMaterial = true;
			object.editOrderQty = true;
			object.editNetPrice = true;
			object.editSLoc = true;
			object.editBatchNo = true;
			// Auto/ Manual bonus found
			if (bBonus) {
				object.editMaterial = false;
				// Manual Bonus
				if (object.higherLevelItem !== "000000") {
					object.editMaterial = (aItemUsage.includes(object.higherLevelItemUsage)) ? false : true;
					object.editNetPrice = false;
				}
			}
			return object;
		},
		splitText: function (taskDescription, index) {
			return taskDescription.split("|")[+index];
		},
		status: function (val) {
			if (val === "Display Only") {
				var status = "Warning";
			} else if (val === "Approved") {
				status = "Success";
			} else if (val === "Rejected" || val === "Pending for Rejection" || val === "Rejected by Previous Level") {
				status = "Error";
			} else if (val === this.getText("PendingApproval") || val === "Pending Approval by previous level") {
				status = "Information";
			}
			return status;
		},
		messageStatus: function (isValid) {
			return (isValid) ? "sap-icon://message-success" : "sap-icon://message-error";
		},
		
		//STRY0012026 Start Item Personalization settings for application users - Release Item
		hideMultipleFilter: function (key) {
			if (key === "salesDocNumEnd" || key === "endDate" || key === "approvalType" || key === "storageLocText") {
				return false;
			} else {
				return true;
			}
		},
		
		//STRY0012026 Start Item Personalization settings for application users - Release Item
		
		
		dateFormatter: function (pTimeStamp) {
			if (!pTimeStamp) {
				return;
			}
			var a = new Date(pTimeStamp);
			return a.toLocaleDateString();
		},
		// setBlurVisibility: function (visiblity) {
		// 	if (visiblity === 13) {
		// 		return "";
		// 	} else if (visiblity === 14) {
		// 		return "BLUR";
		// 	} else if (visiblity === 15) {
		// 		return "BLURGreen";
		// 	}
		// },
		concateText: function (sCode, sText) {
			if (sCode) {
				sText = (sText) ? "(" + sText + ")" : "";
			}
			return [sCode, sText].join(" ");
		}

	};
});