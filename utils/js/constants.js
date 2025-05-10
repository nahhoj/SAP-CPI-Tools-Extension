sap.ui.define([], function() {
    "use strict";
    console.log("Start constants script")
    return {
        prefixId:"SCPITE_",
        apiBaseURLCPI:/^.*integrationsuite.*.cfapps/.test(window.location.origin)?window.location.origin:window.location.origin + "/itspaces",
        iflow64Path:`${$.sap.chromeExtensionURL}utils/env`,
        serviceURL:{
            "logLevel":"/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentSetMplLogLevelCommand",
            "logInfo":"/Operations/com.sap.it.op.tmn.commands.dashboard.webui.MplDetailCommand",
            "listIflow":"/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentsListCommand",
            "listDetailsIflow":"/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentDetailCommand",
            "downloadTraceFile":"/Operations/com.sap.it.op.tmn.commands.dashboard.webui.GetTraceArchiveCommand",
            "ContentPackages":"/odata/1.0/workspace.svc/ContentEntities.ContentPackages",
            "apiWorkspace":"/api/1.0/workspace",
            "apiv1":"/odata/api/v1"
        },
        regExpURL:{
            "detectApiCPI":/^https:\/\/.*\.(hana\.ondemand\.com|platform\.sapcloud\.cn)\/.*$/,
            "detectEnviroment":/^.*integrationsuite.*.cfapps/
        },
        whereOpenEditor:/^(MSG_CONTENT_PAYLOAD|MsgStripPayload-content|MESSAGEDETAILS_TEXTAREA\d{1,3}-inner)$/
    };
});