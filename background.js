'use strict'
const _browser=chrome || browser;

_browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
    if (changeInfo.status === 'complete' && tab.url){
        const regex1 = /^https:\/\/.*\.hana\.ondemand\.com\/itspaces\/shell\/.*/;
        const regex2 = /^https:\/\/.*\.hana\.ondemand\.com\/shell\/.*/;
                                        
        if (regex1.test(tab.url) || regex2.test(tab.url)){
            //send a message to auxiliary script to check was injected                       
            /*chrome.tabs.sendMessage(tabId,{action:'checkInjected'},async(response)=>{    
                //if it throws error means the file it is not injected
                if (!response && chrome.runtime.lastError){
                    console.log("injecting files...")
                    console.log(chrome.runtime.lastError)
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['script/auxiliary_script.js']
                    });
                    chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['script/content_script.js'],            
                        world: 'MAIN'
                    });
                    chrome.scripting.insertCSS({
                        target: { tabId },
                        files: ["utils/css/styles.css"]
                    });
                }
            });*/
            try {
                await _browser.tabs.sendMessage(tabId,{action:'checkInjected'});                
            } catch (error) {                
                console.log("injecting files...")                
                try {
                    await _browser.scripting.executeScript({
                        target: { tabId },
                        files: ['script/auxiliary_script.js']
                    });
                    await _browser.scripting.executeScript({
                        target: { tabId },
                        files: ['script/content_script.js'],            
                        world: 'MAIN'
                    });
                    await _browser.scripting.insertCSS({
                        target: { tabId },
                        files: ["utils/css/styles.css"]
                    });
                } catch (error) {
                    console.log(error);
                }
                  
            }
        }
    }        
});

_browser.contextMenus.onClicked.addListener((e,tab)=>{        
    _browser.tabs.sendMessage(tab.id,{
            tabId:tab.id,
            action: 'clickContextMenu',
            button:e.menuItemId
        });
});

_browser.runtime.onInstalled.addListener(function () {         
    _browser.contextMenus.create({
        id: 'Prettyprinter',
        title: 'Pretty printer',
        documentUrlPatterns:[
            "https://*.hana.ondemand.com/shell/*",
            "https://*.hana.ondemand.com/itspaces/shell/*"]
      });
});