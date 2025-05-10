sap.ui.loader.config({
    paths: {
        'eventHandlers': `${$.sap.chromeExtensionURL}utils/js/eventHandlers`,
        'cpi': `${$.sap.chromeExtensionURL}utils/js/cpi`,
        'constants': `${$.sap.chromeExtensionURL}utils/js/constants`
    }
});

sap.ui.define(
    [
    "eventHandlers",
    "sap/m/Label",
    "sap/m/Text",
    "sap/uxap/ObjectPageHeaderActionButton",
    "sap/m/ObjectStatus",
    "sap/m/Button",
    "cpi",
    "constants",
    "sap/ui/model/json/JSONModel",
    "sap/m/VBox",
    "sap/m/HBox",    
    "sap/ui/core/HTML"
    ], function(eventHandlers,Label,Text,ObjectPageHeaderActionButton,ObjectStatus,Button,cpi,constants,JSONModel,VBox,HBox,HTML) {
    'use strict'
    console.log("Start ui script");    
    const core=sap.ui.getCore();
    return{        
        header:async (id)=>{
            if (core.byId(`${constants.prefixId}header`))
                return
            const toolHeader=core.byId(id);
            const indexContent=toolHeader.indexOfContent(core.byId("__spacer0"));
            //toolHeader.removeContent(core.byId("__spacer0"));
            const hboxTitle=new HBox(`${constants.prefixId}header`,{
                justifyContent: sap.m.FlexJustifyContent.Center,
                items:[            
                        new VBox({
                            items:[                                
                                new HBox({
                                    items:[
                                        new Label({text:"User name",design:"Bold",width: "100px"}),              
                                        new Text({text:"{/userName}"}).addStyleClass("SCPITE_title"),
                                    ]
                                }),
                                new HBox({
                                    items:[
                                        new Label({text:"Enviroment",design:"Bold",width: "100px"}),              
                                        new Text({text:"{/enviroment}"}).addStyleClass("SCPITE_title"),
                                    ]
                                })                        
                            ]
                        })
                    ]
            });
            const usedListButton=new Button(`${constants.prefixId}usedButton`,{
                icon:"sap-icon://fx",      
                tooltip:"Where-Used List",
                press:eventHandlers.usedList        
            })
            const jsonHeader={
                userName: await cpi.getUserLogin(),
                enviroment : constants.apiBaseURLCPI.includes("itspaces")?'NEO':"Foundry"
            }
            const jModelHeader=new JSONModel(jsonHeader);
            hboxTitle.setModel(jModelHeader);
            hboxTitle.addStyleClass("sapUiSmallMarginEnd");
            toolHeader.insertContent(hboxTitle,indexContent+1);
            toolHeader.insertContent(usedListButton,indexContent+2);
        },    
        addButtonsIflowDesigner:async(id)=>{
            if (!core.byId(`${constants.prefixId}traceButton`)){
                const pageHeader=core.byId(id);
                const traceButton=new ObjectPageHeaderActionButton(`${constants.prefixId}traceButton`,{
                                        text: "Trace",
                                        hideText:false,
                                        type:'Transparent',
                                        press:eventHandlers.activateTrace
                                    });
                const messageButton=new ObjectPageHeaderActionButton(`${constants.prefixId}messageButton`,{
                                        text: "Messages",
                                        hideText:false,
                                        type:'Transparent',
                                        press:eventHandlers.openMessages                                                                          
                                    });
                const infoButton=new ObjectPageHeaderActionButton(`${constants.prefixId}infoButton`,{
                                        text: "Info",
                                        hideText:false,
                                        type:'Transparent',
                                        press:eventHandlers.info
                                    });
                
                pageHeader.addAction(new HBox({   
                                            justifyContent:"End",
                                            items:[
                                                infoButton,
                                                traceButton,
                                                messageButton
                                            ]
                                        }))
                /*pageHeader.insertAction(messageButton);
                pageHeader.insertAction(traceButton);
                pageHeader.insertAction(infoButton);*/                  
                eventHandlers.updateTraceStatus(id,pageHeader.getModel().oData.defaultIntegrationFlowModel.iFlowId);
            }       
        },
        addStateObjectsContentPackage:async (id)=>{
            const artifactTable=core.byId(id);
            if (artifactTable.getModel().oData.oArtifacts == undefined)
                return
            //if (artifactTable.getAggregation("items").filter(item=>item.getAggregation("cells")[0].getAggregation("content")[0].getProperty("title")!='').length == document.querySelectorAll(`[id*='${constants.prefixId}deployed']`).length/5)
            if (artifactTable.getAggregation("items").filter(item=>item.getAggregation("cells")[0].getAggregation("content")[0].getProperty("title")!='').length == Array.from(document.querySelectorAll(`[id*='${constants.prefixId}deployed']`)).filter(it=>new RegExp(`${constants.prefixId}deployed\\d+$`).test(it.id)).length)
                return 
            const iflowsDeployed=await cpi.getDeployIflows();
            let i=0;
            for(const artifact of artifactTable.getModel().oData.oArtifacts.results){
                artifact[`${constants.prefixId}status`]="Not deployed";
                artifact[`${constants.prefixId}statusColor`]="Error";
                for(const iflowDeployed of iflowsDeployed){
                    if ([artifact.Name, artifact.name].includes(iflowDeployed.name.textContent)){
                        artifact[`${constants.prefixId}status`]=`Deployed  - ${iflowDeployed.semanticState.textContent}`;
                        artifact[`${constants.prefixId}statusColor`]=iflowDeployed.semanticState.textContent=="ERROR"?"Error":"Success";
                        break;
                    }                    
                }
                if (sap.ui.getCore().byId(`${constants.prefixId}deployed${i}`))
                    sap.ui.getCore().byId(`${constants.prefixId}deployed${i}`).destroy();
                i++;
            }
            
            for(const i in artifactTable.getAggregation("items"))                
                artifactTable.getAggregation("items")[i].getAggregation("cells")[0].getAggregation("content").find(({sId})=>sId.includes("__layout")).addContent(new ObjectStatus(`${constants.prefixId}deployed${i}`,{text:`{${constants.prefixId}status}`,state:`{${constants.prefixId}statusColor}`}))
        },
        securityMaterial:(id)=>{
            const credentialTable=core.byId(id);                        
            //if(credentialTable.getAggregation("items").filter(item=>item.getAggregation("cells")[1].getProperty("text")!="SSH_KNOWN_HOSTS").length==document.querySelectorAll(`[id*='${constants.prefixId}viewCredential']`).length/4)
            if(credentialTable.getAggregation("items").filter(item=>item.getAggregation("cells")[1].getProperty("text")!="SSH_KNOWN_HOSTS").length==Array.from(document.querySelectorAll(`[id*='${constants.prefixId}viewCredential']`)).filter(it=>new RegExp(`${constants.prefixId}viewCredential\\d+$`).test(it.id)).length)
                return;
            for(let i=0;i<credentialTable.getModel().oData.artifactData.length;i++){
                if (sap.ui.getCore().byId(`${constants.prefixId}viewCredential${i}`))
                    sap.ui.getCore().byId(`${constants.prefixId}viewCredential${i}`).destroy();
            }
            for(const i in credentialTable.getAggregation("items")){
                if(credentialTable.getAggregation("items")[i].getAggregation("cells")[2].getProperty("text")!="SSH Known Hosts")
                    credentialTable.getAggregation("items")[i].getAggregation("cells")[7].insertContent(new Button(`${constants.prefixId}viewCredential${i}`,{value:"Details",icon:"sap-icon://detail-view",type:'Transparent',press:eventHandlers.viewDetailsCredential}));
            }
        },
        manageKeystore:(id)=>{
            const keystoreTable=core.byId(id);
            //if (keystoreTable.getAggregation("items").filter(item=>item.getAggregation("cells")[1].getProperty("text")=="Key Pair").length==document.querySelectorAll(`[id*='${constants.prefixId}viewKeystore']`).length/4)
            if (keystoreTable.getAggregation("items").filter(item=>item.getAggregation("cells")[1].getProperty("text")=="Key Pair").length==Array.from(document.querySelectorAll(`[id*='${constants.prefixId}viewKeystore']`)).filter(it=>new RegExp(`${constants.prefixId}viewKeystore\\d+$`).test(it.id)).length)
                return
            for(let i=0;i<Object.keys(keystoreTable.getModel("FromOData").oData).length;i++){
                if (sap.ui.getCore().byId(`${constants.prefixId}viewKeystore${i}`))
                    sap.ui.getCore().byId(`${constants.prefixId}viewKeystore${i}`).destroy();
            }
            for(const i in keystoreTable.getAggregation("items")){
                if (keystoreTable.getAggregation("items")[i].getAggregation("cells")[1].getProperty("text")=="Key Pair")
                    keystoreTable.getAggregation("items")[i].getAggregation("cells")[0].insertItem(new Button(`${constants.prefixId}viewKeystore${i}`,{value:"Details",icon:"sap-icon://detail-view",type:'Transparent',press:eventHandlers.viewNanageKeystore}));
            }
        },
        Announcements:()=>{
            const cookies=document.cookie.split(";");
            if (cookies.find(it=>it.includes("showInfo=false")))
                return
            if (!sap.ui.getCore().byId(`${constants.prefixId}announcementsDialog`)){
                const announcementsDialog=new sap.m.Dialog(`${constants.prefixId}announcementsDialog`,{
                    title:"SAP CPI Tools Extension",
                    contentWidth:"720px",
                    draggable:false,
                    content:new HTML({
                        content:`<div><p style="text-align: center;"><strong>WELCOME TO SAP CPI Tools Extension</strong></p>
    <p>To learn more about this extension, please visit the repository on GitHub: <a href="https://github.com/nahhoj/SAP-CPI-Tools-Extension" target="_blank" rel="noopener"><em>SAP CPI Tools Extension</em></a>. This extension was developed as a hobby in my free time, but I now use it in my job, and it has been very useful to me. I have always wanted to build tools that improve the user experience in SAP CPI. As a result, I&rsquo;ve added some small functionalities to help build and check iFlows.</p>
    <p><strong>Here are some of the features:</strong></p>
    <ul>
    <li>Added information about the logged-in user and the environment being used.</li>
    <li>In the Artifacts tab, under the Design section, it shows whether the flow is deployed or not.</li>
    <li>Added a button to view information (including passwords) in the Security Materials section.</li>
    <li>Added a button to download the key pair in the Keystore section.</li>
    <li>Added a pretty printer in the Trace and Attachments section in the Monitor Message.</li>
    <li>Added a Trace button in the Design Editor for the iFlow to enable trace activation.</li>
    <li>Added an Info button in the Design Editor to display important information about the iFlow.</li>
    <li>Added a Messages button in the Design Editor to show the latest messages, allowing you to open the trace or view the message for each step by clicking it in the iFlow design.</li>
    <li>Added a 'Messages' button in the Design Editor to search for content in IFlow attachments.</li>
    </ul>
    <p>Thank you for using my extension!</p>
      <p>Johan Calderon</p></div>`
                    }),
                    endButton:new Button({
                        text:"Close",
                        press:(event)=>{                            
                            event.getSource().getParent().close();
                            event.getSource().getParent().destroy();
                            document.cookie = "showInfo=false";            
                        }
                    })
                });                
                announcementsDialog.open();
            }            
        }
    }
});