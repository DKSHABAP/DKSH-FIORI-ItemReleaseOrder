sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (JSONModel, MessageBox, MessageToast) {
	"use strict";

	var oHeader = {
		"Content-Type": "application/json;charset=utf-8"
	};
	return {
		// Te
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
			var oView = this.getView(),
				oUserInfoModel = oView.getModel("UserInfo"),
				oUserMangement = oView.getModel("UserManagement"),
				oFilterSaleOrder = oView.getModel("filterModel").getData(),
				oSettingModel = oView.getModel("settings"),
				url = "/WorkboxServices/inbox/filterdetail",
				oPayload = {
					"currentUserInfo": {
						// "taskOwner": oUserInfoModel.getProperty("/name"),
						// "ownerEmail": oUserInfoModel.getProperty("/email"),
						// "taskOwnerDisplayName": oUserInfoModel.getProperty("/displayName")
						"taskOwner": "P000032",
						// "ownerEmail": "jen.ling.lee@dksh.com",
						// "taskOwnerDisplayName": "Jen Ling Lee DKSH"
					},
					"isAdmin": oFilterSaleOrder.isAdmin,
					"salesOrderFilterDto": {
						"customerCode": (oFilterSaleOrder.selectedSoldToParty) ? oFilterSaleOrder.selectedSoldToParty : "",
						"salesDocNumInitial": (oFilterSaleOrder.selectedSalesDocNumInitial) ? oFilterSaleOrder.selectedSalesDocNumInitial : "",
						"salesDocNumEnd": (oFilterSaleOrder.selectedSalesDocNumEnd) ? oFilterSaleOrder.selectedSalesDocNumEnd : "",
						"distributionChannel": (oFilterSaleOrder.selectedDistChannel) ? oFilterSaleOrder.selectedDistChannel : "",
						"initialDate": (oFilterSaleOrder.selectedSalesDocDateFrom) ? oFilterSaleOrder.selectedSalesDocDateFrom.toUTCString() : null,
						"endDate": (oFilterSaleOrder.selectedSalesDocDateTo) ? oFilterSaleOrder.selectedSalesDocDateTo.toUTCString() : null,
						/*						"initialDate": null,
												"endDate": null,*/
						"materialGroupFor": (oFilterSaleOrder.selectedMatGrp4) ? oFilterSaleOrder.selectedMatGrp4 : "",
						"materialGroup": (oFilterSaleOrder.selectedMatGrp) ? oFilterSaleOrder.selectedMatGrp : "",
						"salesOrg": (oFilterSaleOrder.selectedSalesOrg) ? oFilterSaleOrder.selectedSalesOrg : "",
						"division": (oFilterSaleOrder.selectedDivision) ? oFilterSaleOrder.selectedDivision : "",
						"customerPo": (oFilterSaleOrder.selectCustomerPo) ? oFilterSaleOrder.selectCustomerPo : "",
						"itemDlvBlock": (oFilterSaleOrder.selectedDeliveryBlock) ? oFilterSaleOrder.selectedDeliveryBlock : "",
						"shipToParty": (oFilterSaleOrder.selectedShipToParty) ? oFilterSaleOrder.selectedShipToParty : "",
						"headerDlvBlock": (oFilterSaleOrder.selectedHeaderDeliveryBlock) ? oFilterSaleOrder.selectedHeaderDeliveryBlock : "",
						"sapMaterialNum": (oFilterSaleOrder.selectedMaterialNum) ? oFilterSaleOrder.selectedMaterialNum : ""
					},
					"page": oSettingModel.getProperty("/selectedPage"),
					"orderType": "createdAt",
					"orderBy": "ASC"
				};
			debugger;
			oView.setBusy(true);
			oView.getModel("ItemBlockModel").loadData(url, JSON.stringify(oPayload), true, "POST", false, false, oHeader).then(function (oResp) {
				var oData = oView.getModel("ItemBlockModel").getData(),
					aPageNum = [],
					count = 0;
				debugger;
				// No data found
				if (!oData.count) {
					oView.setBusy(false);
					return;
				}

				// Set pagination
				/*				var sNumPage = ((Math.ceil(oData.count / 100) * 100) / oData.pageCount).toString();*/
				var sNumPage = (Math.ceil(oData.count / oData.pageCount));
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
				for (var i = 0; i < 5; i++) {
					count++;
					if (count > sNumPage || count > 5) {
						break;
					}
					aPageNum.push({
						pageNum: count.toString()
					});
				}

				oSettingModel.setProperty("/pagination", aPageNum);
				oPayload = [];
				for (var indx in oData.workBoxDtos) {
					var oDataIndx = oData.workBoxDtos[indx],
						sSplitDate = oDataIndx.taskDescription.split("|")[6].split("/"),
						sDescSet = this.formatter.splitText(oDataIndx.taskDescription, 0);

					oDataIndx.detailLevel = [];
					oDataIndx.expanded = false;
					oDataIndx.DescSet = sDescSet;
					oDataIndx.postingDate = new Date(+sSplitDate[2], sSplitDate[1] - 1, +sSplitDate[0]);
					oPayload.push({
						"salesOrderNum": oDataIndx.requestId,
						"decisionSetId": this.formatter.splitText(oDataIndx.taskDescription, 0),
						"sapTaskId": oDataIndx.processId
					});
				}

				var vUrl = ["/DKSHJavaService/taskSubmit/getSalesBlockOrder/", oView.getModel("UserInfo").getData().name].join("");
				oView.getModel("LoadDataModel").loadData(vUrl, JSON.stringify(oPayload), true, "POST", false, false, oHeader).then(function (oRes) {
						/*				oView.getModel("LoadDataModel").loadData(vUrl, oPayload, true, "POST", false, false, oHeader).then(function (oRes) {*/
						var oLoadData = oView.getModel("LoadDataModel");

						// Remove element in workDtoBox if no task id compare to java endpoint
						// oItemModel.setProperty("/workBoxDtos", oItemModel.getProperty("/workBoxDtos").filter(function (itemBlock) {
						// 	return oLoadData.getProperty("/data").find(function (loadDataItem) {
						// 		return itemBlock.requestId === loadDataItem.salesOrderNum;
						// 	});
						// }));
						for (var index in oData.workBoxDtos) {
							var oItem = oData.workBoxDtos[index];
							var oReturn = oLoadData.getProperty("/data").find(function (item) {
								return item.salesOrderNum === oItem.requestId;
							});
							if (!oReturn) {
								continue;
							}
							oData.workBoxDtos[index].detailLevel.push(oReturn);
						}
						oView.setBusy(false);
					})
					.catch(function (oErr) {
						oView.setBusy(false);
					});
				oView.getModel("ItemBlockModel").refresh();
			}.bind(this)).catch(function (oErr) {
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
		setCancelEditItem: function (oItemBlockModel, aItems, aAggregationContent) {
			if (aItems.length > 0) {
				aAggregationContent.find(function (el, idx) {
					try {
						if (el.getIcon() === "sap-icon://edit") {
							el.setVisible(true);
						} else if (el.getText() === "Save" || el.getText() === "Cancel") {
							el.setVisible(false);
						}
					} catch (err) {
						// Catch exception
					}
				});
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
		controlEditabled: function (object) {

			var aItemUsage = ["B", "C"];
			// high level item carry item's posnr
			if (object.higherLevelItem !== "000000" && aItemUsage.includes(object.higherLevelItemUsage)) {
				object.editMaterial = false;
				object.editOrderQty = false;
				object.editNetPrice = false;
				object.editSLoc = true;
				object.editBatchNo = true;
			} else if (object.higherLevelItem !== "000000" && !object.higherLevelItemUsage) {
				object.editMaterial = false;
				object.editOrderQty = (object.salesItemOrderNo === object.higherLevelItem) ? false : true;
				object.editNetPrice = (object.salesItemOrderNo === object.higherLevelItem) ? true : false;
				object.editSLoc = true;
				object.editBatchNo = true;
				// no high level item carry this item's posnr
			} else if (object.higherLevelItem === "000000") {
				object.editMaterial = true;
				object.editOrderQty = true;
				object.editNetPrice = true;
				object.editSLoc = true;
				object.editBatchNo = true;
			}
			return object;
		},
		splitText: function (taskDescription, index) {
			return taskDescription.split("|")[+index];
		},
		fn_panelClass: function (sStatus) {
			// alert("abc");
			return "";
		},

		itemSlockBlock: function () {

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
			debugger;
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

		concatenateMaterial: function (oVal1, oVal2) {
			if (oVal1 && oVal2) {
				return oVal2 + " (" + oVal1 + ") ";
			} else if (oVal1 && !oVal2) {
				return oVal1;
			} else if (!oVal1 && oVal2) {
				return oVal2;
			} else {
				return "";
			}
		}

	};
});