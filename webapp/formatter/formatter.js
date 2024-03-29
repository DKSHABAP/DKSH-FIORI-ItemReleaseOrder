sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/message/MessageManager",
	"sap/ui/core/format/DateFormat"
], function (JSONModel, MessageBox, MessageToast, MessageManager, DateFormat) {
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
							"&cc").then(function (oUserAccessResp) {}).catch(function (oErr) {
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
				aProperties = ["isAdmin", "materialGroup", "materialCode", "materialGroup4", "salesOrg", "soldtoParty",
					"division", "distChannel", "salesTeam", "salesTerritory", "endDate", "initialDate", "customerPoNo", "shipToparty",
					"salesDocNumInitial", "salesDocNumEnd", "headerDeliveryBlock", "itemDeliveryBlock", "orderType"
				],
				oReqPayload = {
					filter: {}
				};
			if (!oFilterSaleOrder.initialDate || !oFilterSaleOrder.endDate) {
				oSettingModel.setProperty("/valueStateDate", "Error");
				oSettingModel.setProperty("/valueStateDateText", this.getText("dateRangeMandatory"));
				return;
			}
			var tDiff = Math.abs(oFilterSaleOrder.initialDate.getTime() - oFilterSaleOrder.endDate.getTime()),
				dDiff = Math.ceil(tDiff / (1000 * 60 * 60 * 24));
			if (dDiff > 30) {
				oSettingModel.setProperty("/valueStateDate", "Error");
				oSettingModel.setProperty("/valueStateDateText", this.getText("maxDateRange"));
				return;
			}
			oSettingModel.setProperty("/valueStateDate", "None");
			for (var index in Object.keys(aProperties)) {
				var sProperty = aProperties[index];
				if ((sProperty === "endDate" || sProperty === "initialDate")) {
					var dDate = oFilterSaleOrder[sProperty];
					oReqPayload["filter"][sProperty] = this.formatter._dateFormatter.call(this, dDate);
					continue;
				}
				oReqPayload["filter"][sProperty] = oFilterSaleOrder[sProperty];
			}
			var oPaginatedModel = this.getView().getModel("paginatedModel");
			var oPaginatedData = oPaginatedModel.getData();
			Object.assign(oReqPayload, {
				currentUserInfo: {
					taskOwner: oUserInfoModel.getProperty("/name"),
					userId: oUserInfoModel.getProperty("/name")
				},
				isForItem: true,
				skipCount: oPaginatedData.skipCount,
				maxCount: oPaginatedData.maxCount,
				orderBy: oPaginatedData.orderBy,
				orderType: oPaginatedData.orderType
			});
			this.getView().setBusy(true);
			var sUrl = "/DKSHJavaService/taskSubmit/getSalesBlockOrder/";
			return new Promise(
				function (resolve, reject) {
					var oApi = new JSONModel({});
					oApi.loadData(sUrl, JSON.stringify(oReqPayload), true, "POST", false, false, oHeader).then(
							function (oRes) {
								var oResponse = oApi.getData();
								var oData = this.getView().getModel("ItemBlockModel").getData();
								if (oResponse.data.hasOwnProperty("blockData")) {
									oData.data = oResponse.data.blockData;
									oData.count = oResponse.data.totalCount;
								} else {
									oData.data = oResponse.data || [];
									oData.count = oResponse.data.length || 0;
								}
								oUserMangement = this.getView().getModel("UserManagement");
								var iNumberOfPages = Math.floor(oData.count / oPaginatedData.maxCount) + (oData.count % oPaginatedData.maxCount ? 1 : 0);
								var iPageNumber = Math.floor(oPaginatedData.skipCount / oPaginatedData.maxCount) + 1;
								if (iNumberOfPages <= 1) {
									oPaginatedData.scrollRightEnabled = false;
									oPaginatedData.scrollLeftEnabled = false;
									oPaginatedData.firstPageEnabled = false;
									oPaginatedData.lastPageEnabled = false;
								} else {
									if (iPageNumber <= 1) {
										oPaginatedData.scrollRightEnabled = true;
										oPaginatedData.scrollLeftEnabled = false;
										oPaginatedData.firstPageEnabled = false;
										oPaginatedData.lastPageEnabled = true;
									} else if (iPageNumber === iNumberOfPages) {
										oPaginatedData.scrollRightEnabled = false;
										oPaginatedData.scrollLeftEnabled = true;
										oPaginatedData.firstPageEnabled = true;
										oPaginatedData.lastPageEnabled = false;
									} else {
										oPaginatedData.scrollRightEnabled = true;
										oPaginatedData.scrollLeftEnabled = true;
										oPaginatedData.firstPageEnabled = true;
										oPaginatedData.lastPageEnabled = true;
									}
								}
								// this.getView().getModel("ItemBlockModel").setProperty("/count", oData.data.length);
								oPaginatedData.pages = [];
								if (iNumberOfPages <= 5) {
									for (var i = 1; i <= iNumberOfPages; i++) {
										oPaginatedData.pages.push({
											text: i,
											emphasized: iPageNumber === i ? true : false,
											enabled: iPageNumber === i ? false : true
										});
									}
								} else if (iPageNumber < 3) {
									for (var i = 1; i <= 5; i++) {
										oPaginatedData.pages.push({
											text: i,
											emphasized: iPageNumber === i ? true : false,
											enabled: iPageNumber === i ? false : true
										});
									}
								} else if (iNumberOfPages - 2 < iPageNumber) {
									for (var i = 5; i > 0; i--) {
										oPaginatedData.pages.push({
											text: iNumberOfPages - i + 1,
											emphasized: iPageNumber === iNumberOfPages - i + 1 ? true : false,
											enabled: iPageNumber === iNumberOfPages - i + 1 ? false : true
										});
									}
								} else {
									oPaginatedData.pages = [{
										text: iPageNumber - 2,
										emphasized: false,
										enabled: true
									}, {
										text: iPageNumber - 1,
										emphasized: false,
										enabled: true
									}, {
										text: iPageNumber,
										emphasized: true,
										enabled: false
									}, {
										text: iPageNumber + 1,
										emphasized: false,
										enabled: true
									}, {
										text: iPageNumber + 2,
										emphasized: false,
										enabled: true
									}];
								}
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
								oPaginatedModel.refresh();
								resolve(this.getView().getModel("ItemBlockModel"));
							}.bind(this))
						.catch(function (oErr) {
							this.getView().setBusy(false);
						}.bind(this));
				}.bind(this));
		},
		postJavaService: function (Model, sUrl, oPayload, sMethod) {
			return new Promise(
				function (resolve, reject) {
					if (oPayload) {
						Model.loadData(sUrl, oPayload, true, sMethod, false, false, oHeader).then(function (oRes) {
							resolve(Model.getData());
						}.bind(this)).catch(function (oErr) {
							reject(oErr);
						}.bind(this));
					} else {
						Model.loadData(sUrl, true, sMethod, false, false, oHeader).then(function (oRes) {
							resolve(Model.getData());
						}.bind(this)).catch(function (oErr) {
							reject(oErr);
						}.bind(this));
					}
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
		controlEditabled: function (object, aItems, aItemUsage, oEditConfig) {
			object.editMaterial = (oEditConfig) ? oEditConfig.editMaterial : true;
			object.editOrderQty = (oEditConfig) ? oEditConfig.editOrderQty : true;
			object.editNetPrice = (oEditConfig) ? oEditConfig.editNetPrice : true;
			object.editSLoc = (oEditConfig) ? oEditConfig.editSLoc : true;
			object.editBatchNo = (oEditConfig) ? oEditConfig.editBatchNo : true;
			if (object.higherLevelItem === "000000") {
				// Parent item
				var bBonus = aItems.some(function (oItem) {
					return object.salesItemOrderNo === oItem.getBindingContext("ItemBlockModel").getObject().higherLevelItem;
				});
				object.editMaterial = (bBonus) ? false : true;
			} else {
				// Child Item (Bonus)
				object.editMaterial = (aItemUsage.includes(object.higherLevelItemUsage)) ? false : true;
				object.editNetPrice = false;
			}
			return object;
		},
		splitText: function (taskDescription, index) {
			return taskDescription.split("|")[+index];
		},
		displayStatus: function (taskItemStatus, visiblity) {
			// 22: Pending Approval
			// 23: Pending Approval by previous level
			// 24: Approved
			// 25: Rejected
			// 27: Rejected by Previous Level
			// 32: Display Only
			// 70: Rejected from ECC
			var iStatus = taskItemStatus + visiblity;
			if (iStatus === 32) {
				var status = "Warning";
			} else if (iStatus === 24) {
				status = "Success";
			} else if (iStatus === 25 || iStatus === 27 || iStatus === 70) {
				status = "Error";
			} else if (iStatus === 22 || iStatus === 23) {
				status = "Information";
			}
			// if (val === "Display Only") {
			// 	var status = "Warning";
			// } else if (val === "Approved") {
			// 	status = "Success";
			// } else if (val === "Rejected" || val === "Pending for Rejection" || val === "Rejected by Previous Level") {
			// 	status = "Error";
			// } else if (val === this.getText("PendingApproval") || val === "Pending Approval by previous level") {
			// 	status = "Information";
			// }
			return status;
		},
		messageStatus: function (isValid) {
			return (isValid) ? "sap-icon://message-success" : "sap-icon://message-error";
		},
		dateFormatter: function (pTimeStamp) {
			if (pTimeStamp) {
				return new Date(pTimeStamp).toLocaleDateString();
			} else {
				return new Date().toLocaleDateString();
			}
		},
		_dateFormatter: function (dDate) {
			var oDateFormat = DateFormat.getDateInstance({
				pattern: "yyyy/MM/dd"
			});
			if (dDate) {
				return oDateFormat.format(dDate);
			} else {
				return oDateFormat.format(new Date());
			}
		},
		concateText: function (sCode, sText) {
			if (sCode) {
				sText = (sText) ? "(" + sText + ")" : "";
			}
			return [sCode, sText].join(" ");
		},
		returnDate: function (dDate, iDays) {
			var dRDate = dDate;
			return new Date(dRDate.setDate(dRDate.getDate() - iDays));
		},
		setNumericAndSort: function (oData, aProperty) {
			if (oData) {
				oData.userPersonaDto.map(function (item) {
					for (var index in aProperty) {
						var sProperty = aProperty[index];
						item[sProperty] = +item[sProperty];
					}
					return item;
				});
				oData.userPersonaDto.sort(function (a, b) {
					for (var index in aProperty) {
						var sProperty = aProperty[index];
						return a[sProperty] - b[sProperty];
					}
				});
			}
			return oData;
		}
	};
});