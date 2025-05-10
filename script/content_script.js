'use strict'
window.sapui5Check=()=>{
    return this.sap;
}

window.askChromeExtensionURL=()=>{
    return new Promise((resolve,reject)=>{
        window.addEventListener('resposeDataChromeApi',(event)=>{            
            window.removeEventListener('resposeDataChromeApi', this);
            resolve(event.detail.url);            
        });
        let detail={};
        detail.request="chromeExtensionURL";
        window.dispatchEvent(new CustomEvent("requestDataChromeApi",{detail}));        
        setTimeout(() =>reject('Cannot get chrome extension URL'), 200);
    });
}

window.startProcess=()=>{
    askChromeExtensionURL()
    .then((chromeExtensionURL)=>{
        sap.ui.getCore().ready().then(()=>{
            $.sap.chromeExtensionURL = chromeExtensionURL;
            sap.ui.loader.config({
                paths: {
                    'ui': `${$.sap.chromeExtensionURL}utils/js/ui`,
                    'utils': `${$.sap.chromeExtensionURL}utils/js/utils`
                }
            });
            sap.ui.require([
                "ui",
                "utils"
            ], function (ui,utils){
                const process=()=>{
                    let id;                        
                    //Add Header
                    if (sap.ui.getCore().byId("shell--toolHeader")){
                        ui.header("shell--toolHeader");
                        //open Announcements Extension                    
                        //ui.Announcements();
                    }
            
                    //Add buttons and counter trace in designer flow section    
                    if (document.querySelector("[id$='--iflowObjectPageHeader']") && (id=document.querySelector("[id$='--iflowObjectPageHeader']").id)){
                        ui.addButtonsIflowDesigner(id);
                    }
    
                    //add state to objects in contentpackage
                    if (document.querySelector("[id$='--artifactTable'] .sapMList") && (id=document.querySelector("[id$='--artifactTable'] .sapMList").id)){
                        ui.addStateObjectsContentPackage(id);
                    }
    
                    //add buttons security material
                    if (sap.ui.getCore().byId("SECURITYMATERIAL_TABLE")){
                        ui.securityMaterial("SECURITYMATERIAL_TABLE");
                    }
    
                    //add buttons manage keystore
                    if (document.querySelector("[id$='---com.sap.it.op.web.ui.pages.keystore.KeystoreManagement--KEYSTOREMANAGEMENT_TABLE_ID']") && (id=document.querySelector("[id$='---com.sap.it.op.web.ui.pages.keystore.KeystoreManagement--KEYSTOREMANAGEMENT_TABLE_ID']").id)){
                        ui.manageKeystore(id);
                    }
                    setTimeout(()=>process(), 250);                    
                }
                setTimeout(()=>process(),500);
            });
        });
    })
    .catch((message)=>{
        console.log(message);
        window.startProcess();
    });
}

//this is the start execute script
setTimeout(() => {
    console.log("Start check sapui5");
    if(window.sapui5Check()==undefined)
        setTimeout(() =>window.sapui5Check(), 200);
    else
        window.startProcess();
}, 200);