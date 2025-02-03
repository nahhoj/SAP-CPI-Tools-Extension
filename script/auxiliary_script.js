'use strict'
console.log("Start auxiliary_script script");
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if (message.action=="checkInjected")
        sendResponse(true);
    else if (message.action=="clickContextMenu") {
        let detail={};
        detail.clicked=window.clicked;        
        window.dispatchEvent(new CustomEvent("OpenEditor",{detail}));    
        sendResponse(true);
    }   
});

window.addEventListener('contextmenu',(e)=>{
    window.clicked = e.target.id;
});

window.addEventListener("requestDataChromeApi",(event)=>{    
    if (event.detail.request=="chromeExtensionURL"){
        let detail={};
        try {
            detail.url=chrome.runtime.getURL("/");
            window.dispatchEvent(new CustomEvent("resposeDataChromeApi",{detail}));   
        } catch (error){}
    }
});