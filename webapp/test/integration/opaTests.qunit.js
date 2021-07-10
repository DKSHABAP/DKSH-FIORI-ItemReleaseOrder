/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"dksh/connectclient/itemblockorder/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});