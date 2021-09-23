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
				oSettingModel = this.getView().getModel("settings"),
				oPayload = {
					"filter": {
						"materialGroup": (oFilterSaleOrder.selectedMatGrp) ? oFilterSaleOrder.selectedMatGrp : "",
						"materialCode": (oFilterSaleOrder.selectedMaterialNum) ? oFilterSaleOrder.selectedMaterialNum : "",
						"isAdmin": oFilterSaleOrder.isAdmin,
						"itemDeliveryBlock": (oFilterSaleOrder.selectedDeliveryBlock) ? oFilterSaleOrder.selectedDeliveryBlock : "",
						"salesOrg": (oFilterSaleOrder.selectedSalesOrg) ? oFilterSaleOrder.selectedSalesOrg : "",
						"soldtoParty": (oFilterSaleOrder.selectedSoldToParty) ? oFilterSaleOrder.selectedSoldToParty : "",
						"division": (oFilterSaleOrder.selectedDivision) ? oFilterSaleOrder.selectedDivision : "",
						"distChannel": (oFilterSaleOrder.selectedDistChannel) ? oFilterSaleOrder.selectedDistChannel : "",
						"salesTeam": (oFilterSaleOrder.selectedSalesTeam) ? oFilterSaleOrder.selectedSalesTeam : "",
						"endDate": (oFilterSaleOrder.selectedSalesDocDateTo) ? oFilterSaleOrder.selectedSalesDocDateTo.toUTCString() : null,
						"initialDate": (oFilterSaleOrder.selectedSalesDocDateFrom) ? oFilterSaleOrder.selectedSalesDocDateFrom.toUTCString() : null,
						"salesTerritory": (oFilterSaleOrder.selectedSalesTerritory) ? oFilterSaleOrder.selectedSalesTerritory : "",
						"customerPoNo": (oFilterSaleOrder.selectCustomerPo) ? oFilterSaleOrder.selectCustomerPo : "",
						"shipToparty": (oFilterSaleOrder.selectedShipToParty) ? oFilterSaleOrder.selectedShipToParty : "",
						"materialGroup4": (oFilterSaleOrder.selectedMatGrp4) ? oFilterSaleOrder.selectedMatGrp4 : "",
						"salesDocNumInitial": (oFilterSaleOrder.selectedSalesDocNumInitial) ? oFilterSaleOrder.selectedSalesDocNumInitial : "",
						"salesDocNumEnd": (oFilterSaleOrder.selectedSalesDocNumEnd) ? oFilterSaleOrder.selectedSalesDocNumEnd : "",
						"headerDeliveryBlock": (oFilterSaleOrder.selectedHeaderDeliveryBlock) ? oFilterSaleOrder.selectedHeaderDeliveryBlock : "",
					},
					"currentUserInfo": {
						"eventId": "",
						"isSubstituted": false,
						"isProcessed": false,
						"taskOwner": oUserInfoModel.getProperty("/name"),
						"userId": oUserInfoModel.getProperty("/name")
							// "taskOwner": "P000142",
							// "userId": "P000142",
							// "ownerEmail": oUserInfoModel.getProperty("/email")
					},
					"createdBy": "",
					"orderBy": "",
					"orderType": "",
					"processName": []
				};
			debugger;
			this.getView().setBusy(true);
			var sUrl = "/DKSHJavaService/taskSubmit/getSalesBlockOrder/";
			this.getView().getModel("ItemBlockModel").loadData(sUrl, JSON.stringify(oPayload), true, "POST", false, false, oHeader).then(function (
					oRes) {
					var oData = this.getView().getModel("ItemBlockModel").getData(),
						aPageNum = [],
						count = 0;
					// No data found
					if (!oData.data.length === 0 || !oData) {
						this.getView().setBusy(false);
						return;
					}
					debugger;
					this.getView().getModel("ItemBlockModel").setProperty("/count", oData.data.length);
					oData.data.map(function (data) {
						var sSplitDate = data.postingDate.split("/");
						data.postingDate = new Date(+sSplitDate[2], sSplitDate[1] - 1, +sSplitDate[0]);
						Object.assign(data, {
							expanded: false,
							itemBtnEanbled: true
						});
					}.bind(this));
					this.getView().getModel("ItemBlockModel").refresh();
					// Set pagination
					// var sNumPage = (Math.ceil(oData.count / oData.pageCount));
					/*				for (var i = 0; i < new Array(sNumPage).length; i++) {
										count++;
										aPageNum.push({
											pageNum: count.toString()
										});
									}*/
					/*				for (var i = 0; i < sNumPage; i++) {
										count++;
										aPageNum.push({
											pageNum: count.toString()
										});
									}*/
					// Temporary logic to fix pagination as 5 (Max)
					// for (var i = 0; i < 5; i++) {
					// 	count++;
					// 	if (count > sNumPage || count > 5) {
					// 		break;
					// 	}
					// 	aPageNum.push({
					// 		pageNum: count.toString()
					// 	});
					// }
					// debugger;
					// oSettingModel.setProperty("/pagination", aPageNum);
					this.getView().setBusy(false);
				}.bind(this))
				.catch(function (oErr) {
					debugger;
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
				object.editOrderQty = false;
				if (object.higherLevelItem !== "000000") {
					object.editOrderQty = (aItemUsage.includes(object.higherLevelItemUsage)) ? false : true;
					object.editNetPrice = false;
				}
				object.editSLoc = true;
				object.editBatchNo = true;
			}
			return object;
		},
		splitText: function (taskDescription, index) {
			return taskDescription.split("|")[+index];
		},
		reservedTask: function (processor, taskowner) {
			/*			if (processor !== "") {
							if (processor !== taskowner) {
								return true;
							} else {
								return false;
							}
						} else {
							return false;
						}*/
		},
		approveHeaderEnable: function (processor, taskowner) {
			/*			if (processor !== "") {
							if (processor !== taskowner) {
								return false;
							} else {
								return true;
							}
						} else {
							return true;
						}*/
		},

		status: function (val) {
			if (val === "Display Only") {
				return "Warning";
			} else if (val === "Approved") {
				return "Success";
			} else if (val === "Rejected") {
				return "Error";
			} else if (val === "Pending Approval") {
				return "Information";
			} else if (val === "Pending Approval by previous level") {
				return "Information";
			} else if (val === "Rejected by Previous Level") {
				return "Error";
			}
		},
		messageStatus: function (isValid) {
			return (isValid) ? "sap-icon://message-success" : "sap-icon://message-error";
		},
		dateFormatter: function (pTimeStamp) {
			if (!pTimeStamp) {
				return;
			}
			var a = new Date(pTimeStamp);
			return a.toLocaleDateString();
			/*			var dateFormat = a.toLocaleDateString();*/
			/*			return dateFormat;*/
			// var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
			// 	pattern: "dd/MM/YYYY"
			// });
			// return dateFormat.format(new Date(pTimeStamp));
		},
		hideMultipleFilter: function (key) {
			if (key === "salesDocNumEnd" || key === "endDate" || key === "approvalType" || key === "storageLocText") {
				return false;
			} else {
				return true;
			}
		},
		// no need
		getDecisionSet: function (taskDec) {
			return taskDec.split("|")[0];
		},
		// no need
		getLevel: function (taskDec) {
			return taskDec.split("|")[2];
		},
		// no need
		getDate: function (taskDec) {
			return taskDec.split("|")[6];
		},
		setBlurVisibility: function (visiblity) {
			if (visiblity === 13) {
				return "";
			} else if (visiblity === 14) {
				return "BLUR";
			} else if (visiblity === 15) {
				return "BLURGreen";
			}

		},

		setStockBlock: function (itemStockBlock) {
			if (itemStockBlock !== null) {
				return "ACTIVE";
			}
		},
		setEditRestriction: function (levelNum, processor, taskOwner) {
			if (processor === "" && levelNum === "L1") {
				return true;
			} else if (processor === taskOwner && levelNum === "L1") {
				return true;
			} else {
				return false;
			}

			if (levelNum) {
				if (levelNum === "L1") {
					return true;
				} else {
					return false;
				}
			}

		},

		setARRestriction: function (processor, taskOwner) {
			if (processor === "") {
				return true;
			} else if (processor === taskOwner) {
				return true;
			} else {
				return false;
			}
		},
		// no need
		setMarkIcon: function (oAction) {
			if (oAction === "A") {
				return "sap-icon://circle-task-2";
			} else if (oAction === "R") {
				return "sap-icon://circle-task-2";
			} else {
				return "";
			}
		},
		setMarkVisibility: function (oAction) {
			if (oAction === "A" || oAction === "R") {
				return true;
			} else {
				return false;
			}
		},
		// no need
		setMarkType: function (oAction) {
			if (oAction === "A") {
				return "Success";
			} else if (oAction === "R") {
				return "Error";
			} else {
				return "None";
			}
		},

		concatenateStrings: function (oVal1, oVal2, oVal3) {
			if (!oVal1) {
				oVal1 = 1;
			} else {
				oVal1 = parseFloat(oVal1);
			}
			if (!oVal2) {
				oVal2 = 1;
			} else {
				oVal2 = parseFloat(oVal2);
			}
			if (oVal1 && oVal2) {
				var val = oVal1 * oVal2;
				return val.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + " " + "(" + oVal3 + ")";
				// return val.toFixed(2) + " " + oVal3;
			} else if (oVal1 && !oVal2) {
				val = oVal1 * oVal2;
				return val.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + " " + "(" + oVal3 + ")";
				// return val.toFixed(2) + " " + oVal3;
			} else if (!oVal1 && oVal2) {
				val = oVal1 * oVal2;
				return val.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + " " + "(" + oVal3 + ")";
				// return val.toFixed(2) + " " + oVal3;
			} else {
				return "";
			}
		},

		concateText: function (sCode, sText) {
			if (sCode) {
				sText = (sText) ? "(" + sText + ")" : "";
				return [sCode, sText].join(" ");
			}
		}

	};
});