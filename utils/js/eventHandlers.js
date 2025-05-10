sap.ui.loader.config({
    paths: {
        'cpi': `${$.sap.chromeExtensionURL}utils/js/cpi`,
        'constants': `${$.sap.chromeExtensionURL}utils/js/constants`,
        'utils': `${$.sap.chromeExtensionURL}utils/js/utils`
    }
});
sap.ui.define([
    "cpi",
    "constants",
    "sap/m/MessageToast",    
    "sap/m/BusyDialog",
    "sap/m/Dialog",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Button",
    "sap/ui/model/json/JSONModel",
    "sap/m/QuickView",
    "sap/m/QuickViewPage",
    "sap/m/QuickViewGroup",
    "sap/m/QuickViewGroupElement",
    "sap/ui/codeeditor/CodeEditor",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/InputListItem",
    "sap/m/Input",
    "sap/m/CheckBox",
    "sap/m/ProgressIndicator",
    "sap/m/MessageBox",
    "sap/m/IconTabBar",
    "sap/m/IconTabFilter",
    "sap/m/ObjectStatus",
    "sap/m/DatePicker",
    "sap/m/Select",
    "utils"
], function(cpi,constants,MessageToast,BusyDialog,Dialog,Table,Column,ColumnListItem,Text,Button,JSONModel,QuickView,QuickViewPage,QuickViewGroup,QuickViewGroupElement,CodeEditor,VBox,HBox,InputListItem,Input,CheckBox,ProgressIndicator,MessageBox,IconTabBar,IconTabFilter,ObjectStatus,DatePicker,Select,utils){
    "use strict";    
    console.log("Start eventHandler script")
    let counterTimer=10;
    const updateTraceStatusTImer=async(id,iflowId,_status=false,_traceExpires=null)=>{
        //console.log("updateTraceStatusTImer is running...");
        const pageHeader=sap.ui.getCore().byId(id);
        if (pageHeader){
            const textDescription=pageHeader.getProperty("objectSubtitle").split(" - ")[0];
            if (textDescription!=''){
                if (counterTimer>=10){
                    counterTimer=0;
                    const {id,runtimeLocationId}=await cpi.getFlowId(iflowId);
                    let {status,traceExpires,endPointInfo,packageInfo,deployState,state,logLevel}=await cpi.getIflowSTraceStatus(id,runtimeLocationId);
                    if (packageInfo.length==0)
                        packageInfo=await cpi.getPackage(iflowId);
                    _status = status == "true"?true:false;
                    _traceExpires= traceExpires;                    
                    let jsonInfoIflow=[
                        {
                            "label": "Package",
                            "value": packageInfo.length>0?packageInfo.find(it=>it.name=="artifact.package.name").value:"",
                            "url": packageInfo.length>0?`${constants.apiBaseURLCPI}/shell/design/contentpackage/${packageInfo.find(it=>it.name=="artifact.package.id").value}?section=ARTIFACTS`:"",
                            "elementType": "link"
                        },
                        {
                            "label": "Deploy status",
                            "value": deployState
                        },
                        {
                            "label": "State",
                            "value": state
                        },
                        {
                            "label": "Log level",
                            "value": logLevel
                        }
                    ];
                    for(const endPoint of endPointInfo){
                        jsonInfoIflow.push({
                            "label": endPoint.endpointCategory,
                            "value": endPoint.endpointUrl
                        })
                    }
                    const oModelInfoIflow=new JSONModel(jsonInfoIflow);
                    pageHeader.setModel(oModelInfoIflow,"infoIflow");
                
                }
                const remining=new Date(_traceExpires) - new Date();
                if (_status && remining>=0){
                    const seconds = String(Math.floor((remining / 1000) % 60)).padStart(2, '0');
                    const minutes = String(Math.floor((remining / (1000 * 60)) % 60)).padStart(2, '0');
                    const hours = String(Math.floor((remining / (1000 * 60 * 60)) % 24)).padStart(2, '0');
                    pageHeader.setProperty("objectSubtitle", `${textDescription} - Trace enabled time remining: ${hours}:${minutes}:${seconds}`);       
                }
                else
                    pageHeader.setProperty("objectSubtitle", `${textDescription} - Trace disabled`);            
            }        
            setTimeout(() => updateTraceStatusTImer(id,iflowId,_status,_traceExpires), 1000);
            counterTimer++;
        }        
    }

    const openEditorDialog=(text)=>{
        const {textFormat,type}=utils.prettyPrint(text);
        if (sap.ui.getCore().byId(`${constants.prefixId}EditorDialog`))
            sap.ui.getCore().byId(`${constants.prefixId}EditorDialog`).destroy();
        const dialog=new Dialog(`${constants.prefixId}EditorDialog`,{
            title: `Editor - ${type.toUpperCase()}`,
            contentWidth: "100%",        
            contentHeight:"100%",
            verticalScrolling:false,
            content: new CodeEditor({
                        width:"100%",
                        height:"100%",
                        editable:false,
                        type,
                        colorTheme:"chrome"
                    }),
            endButton: new Button({
                text: "Close",
                press: ()=>{
                    dialog.close();
                    dialog.destroy();                        
                }
            })
        });      
        dialog.getAggregation("content")[0].setValue(textFormat);        
        dialog.open();        
    }

    const openTrace=async(event)=>{
        const logLevel=event.getSource().getModel().getProperty("LogLevel",event.getSource().getBindingContext());
        const status=event.getSource().getModel().getProperty("Status",event.getSource().getBindingContext());
        const trace=[];
        if (logLevel=="TRACE" || status == "FAILED"){
            clearTrace();
            sap.ui.getCore().byId(`${constants.prefixId}Popover`).close();
            const busyDialog=new BusyDialog();
            busyDialog.open();
            const messageGuid=event.getSource().getModel().getProperty("MessageGuid",event.getSource().getBindingContext());
            const pages=await cpi.getTraceSteps(messageGuid);
            if (pages.length>0){
                const BPMObject=document.querySelector("[id$='--galileiEditorView--galileiEditor']");
                for (const page of pages){
                    for(const step of page){                        
                        const obj=BPMObject.querySelector(`[id$='${step.ModelStepId}'] g .activity,[id$='${step.ModelStepId}'] g .event,[id$='${step.ModelStepId}'] .messageFlow,[id$='${step.ModelStepId}'] g .event,[id$='${step.ModelStepId}'] .gateway`);
                        if (obj){
                                if (obj.style.fill !== "red"){
                                    obj.style.fill = step.Error?"red":"green";
                                    obj.style.stroke = step.Error?"red":"green";
                                    obj.style.strokeWidth = 6;
                                }
                                const texts=BPMObject.querySelector(`[id$='${step.ModelStepId}']`).querySelectorAll("text");                                
                                let _name="";
                                for(const text of texts){
                                    _name+=text.textContent + " ";
                                }
                            if (trace.find(it=>it.ModelStepId==step.ModelStepId)==undefined){                                
                                    BPMObject.querySelector(`[id$='${step.ModelStepId}']`).setAttribute(`data-${constants.prefixId}ModelStepId`,step.ModelStepId);                                 
                                    BPMObject.querySelector(`[id$='${step.ModelStepId}']`).setAttribute(`data-${constants.prefixId}name`,_name); 
                                    BPMObject.querySelector(`[id$='${step.ModelStepId}']`).removeEventListener("dblclick",openTracDetails);               
                                    BPMObject.querySelector(`[id$='${step.ModelStepId}']`).addEventListener("dblclick",openTracDetails);                                                               
                            }                        
                        }                        
                        trace.push({
                            RunId:step.RunId,
                            ChildCount:step.ChildCount,
                            ModelStepId:step.ModelStepId,                            
                            Error:step.Error          
                        });
                    }  
                }           
            }
            const oModelTrace=new JSONModel(trace);         
            sap.ui.getCore().byId(`${constants.prefixId}Popover`).setModel(oModelTrace,"trace");
            busyDialog.close();
            busyDialog.destroy();            
        }
    }

    const openTracDetails=async(event)=>{
        const busyDialog=new BusyDialog();
        busyDialog.open();
        const traceJson=sap.ui.getCore().byId(`${constants.prefixId}Popover`).getModel("trace").oData;
        const modelStepId = event.currentTarget.getAttribute(`data-${constants.prefixId}ModelStepId`);        
        const name = event.currentTarget.getAttribute(`data-${constants.prefixId}name`);        
        const steps=traceJson.filter(it=>it.ModelStepId==modelStepId);
        const stepsModel=[];        
        for (const step in steps){
            stepsModel.push({
                key:`${steps[step].RunId}:${steps[step].ChildCount}`,                    
                text:`${steps[step].ChildCount}${steps[step].Error ? ' - error' : ''}`
            });                
        }
        
        let dialogTrace=sap.ui.getCore().byId(`${constants.prefixId}dialogTrace`);        
        if (dialogTrace)
            dialogTrace.destroy();
        dialogTrace=new Dialog(`${constants.prefixId}dialogTrace`,{
            title: `Trace - ${modelStepId} - ${name}`,
            contentWidth: "100%",        
            contentHeight:"100%",
            verticalScrolling:false,
            subHeader: new sap.m.Bar({
                            contentRight:[
                                new sap.m.Label({text: "Step"}),
                                new sap.m.ComboBox({
                                    items: {
                                        path: "stepsModel>/",
                                        template: new sap.ui.core.Item({
                                            text: "{stepsModel>text}",
                                            key: "{stepsModel>key}"
                                        })
                                    },
                                    change:getTraceDetails,                        
                                }),
                                new sap.m.ComboBox({
                                    items: {
                                        path: "subStepsModel>/",
                                        template: new sap.ui.core.Item({
                                            text: "{subStepsModel>text}",
                                            key: "{subStepsModel>key}"
                                        })
                                    },
                                    visible:false,
                                    change:getTraceDetails,                        
                                }),
                                new Button(`${constants.prefixId}DownloadButton`,{
                                    text:"Download",
                                    enabled:false,
                                    press:async(event)=>{
                                        const traceId=event.getSource().getModel()?.oData?.traceId;
                                        if (traceId){
                                            const base64=await cpi.getTraceDownload(traceId);  
                                            const link = document.createElement('a');         
                                            link.setAttribute('href', 'data:text/plain;base64,' + base64);
                                            link.setAttribute('download', `${modelStepId}.zip`);
                                            document.body.appendChild(link);            
                                            link.click();            
                                            document.body.removeChild(link);                                            
                                        }
                                    }
                                })
                            ]
            }),
            content: new IconTabBar({
                        stretchContentHeight:true,
                        visible:false,
                        items:[
                            new IconTabFilter({
                                key:"Headers",
                                text:"Headers",
                                content:[
                                    new sap.m.ScrollContainer({
                                        height:"100%",
                                        vertical:true,
                                        content:[
                                            new sap.m.Table({
                                                columns: [
                                                    new sap.m.Column({
                                                        header: new sap.m.Text({ text: "Name" })
                                                    }),
                                                    new sap.m.Column({
                                                        header: new sap.m.Text({ text: "Value" })
                                                    })                                           
                                                ],
                                                items: {
                                                    path: "headerModel>/",
                                                    template: new sap.m.ColumnListItem({
                                                        cells: [
                                                            new sap.m.Text({ text: "{headerModel>name}" }),
                                                            new sap.m.Text({ text: "{headerModel>value}" })                                                   
                                                        ]
                                                    })
                                                }
                                            })
                                        ]
                                    })
                                ]
                            }),
                            new IconTabFilter({
                                key:"Properties",
                                text:"Properties",
                                content:[                                 
                                    new sap.m.ScrollContainer({
                                        height:"100%",
                                        vertical:true,
                                        content:[
                                            new sap.m.Table({
                                                columns: [
                                                    new sap.m.Column({
                                                        header: new sap.m.Text({ text: "Name" })
                                                    }),
                                                    new sap.m.Column({
                                                        header: new sap.m.Text({ text: "Value" })
                                                    })                                           
                                                ],
                                                items: {
                                                    path: "propertyModel>/",
                                                    template: new sap.m.ColumnListItem({
                                                        cells: [
                                                            new sap.m.Text({ text: "{propertyModel>name}" }),
                                                            new sap.m.Text({ text: "{propertyModel>value}" })                                                   
                                                        ]
                                                    })
                                                }
                                            })
                                        ]
                                    })
                                ]
                            }),
                            new IconTabFilter({
                                key:"Body",
                                text:"Body",
                                content: new CodeEditor({
                                    width:"100%",
                                    height:"100%",
                                    editable:false,                                    
                                    colorTheme:"chrome"
                                })
                            }),
                            new IconTabFilter({
                                key:"Error",
                                text:"Error",
                                visible:"{errorModel>/visible}",
                                content: new Text({
                                    text:"{errorModel>/error}"
                                })
                            })
                        ]                         
            }),
            endButton: new Button({
                text: "Close",
                press: ()=>{
                    dialogTrace.close();
                    dialogTrace.destroy();                        
                }
            })
        });        
        dialogTrace.setModel(new JSONModel(stepsModel),"stepsModel");
        dialogTrace.open();        
        busyDialog.close();
        busyDialog.destroy();
    }

    const clearTrace=()=>{
        const BPMObject=document.querySelector("[id$='--galileiEditorView--galileiEditor']");
        let objs=BPMObject.querySelectorAll(`g .activity,g .event,.messageFlow,g .event,.gateway`);
        for(const obj of objs){
            obj.style="";            
        }
        objs=BPMObject.querySelectorAll(`[data-${constants.prefixId}ModelStepId]`);
        for(const obj of objs){
            obj.removeEventListener("click",openTracDetails);
        }
    }

    const getTraceDetails=async(event)=>{        
        const busyDialog=new BusyDialog();
        busyDialog.open();
        const dialogTrace=sap.ui.getCore().byId(`${constants.prefixId}dialogTrace`);        
        const editor=dialogTrace.getAggregation("content")[0].getAggregation("items")[2].getAggregation("content")[0];
        let runId;
        let childCount;
        let subStep;
        if (event.getSource().getBindingInfo("items").model=="stepsModel"){
            runId=event.getSource().getProperty("selectedKey").split(":")[0];
            childCount=event.getSource().getProperty("selectedKey").split(":")[1];
            subStep=0;
        }
        else{
            runId=dialogTrace.getAggregation("subHeader").getAggregation("contentRight")[1].getProperty("selectedKey").split(":")[0];
            childCount=dialogTrace.getAggregation("subHeader").getAggregation("contentRight")[1].getProperty("selectedKey").split(":")[1];
            subStep=event.getSource().getProperty("selectedKey");
        }
        const {header,property,body,count,traceId}=await cpi.getTraceContent(runId,childCount,subStep);        
        sap.ui.getCore().byId(`${constants.prefixId}DownloadButton`).setModel(new JSONModel({traceId}));
        sap.ui.getCore().byId(`${constants.prefixId}DownloadButton`).setEnabled(true);
        if (count>1){
            const subSteps=[];            
            for (let x=count-1;x>=0;x--){
                subSteps.push({
                    key:`${x}`,                    
                    text:`${x+1}`
                });                
            }
            dialogTrace.getAggregation("subHeader").getAggregation("contentRight")[0].setText("Step / Substep");
            dialogTrace.getAggregation("subHeader").getAggregation("contentRight")[2].setSelectedKey(subStep)
            dialogTrace.getAggregation("subHeader").getAggregation("contentRight")[2].setVisible(true);
            dialogTrace.setModel(new JSONModel(subSteps),"subStepsModel");
        }
        else{
            dialogTrace.getAggregation("subHeader").getAggregation("contentRight")[0].setText("Step");
            dialogTrace.getAggregation("subHeader").getAggregation("contentRight")[2].setVisible(false);
        }
        const error=sap.ui.getCore().byId(`${constants.prefixId}Popover`).getModel("trace").oData.filter(it=>it.ChildCount == childCount && it.RunId == runId)[0].Error;        
        dialogTrace.setModel(new JSONModel(header),"headerModel");
        dialogTrace.setModel(new JSONModel(property),"propertyModel");        
        dialogTrace.setModel(new JSONModel({
            error,
            visible:error?true:false
        }),"errorModel");
        dialogTrace.getAggregation("content")[0].setVisible(true);
        const {textFormat,type}=utils.prettyPrint(body);
        editor.setType(type);
        editor.setValue(textFormat);        
        busyDialog.close();
        busyDialog.destroy();
    }

    const getlastestMessage=async(flowId,fromDate,toDate)=>{        
        const popover=sap.ui.getCore().byId(`${constants.prefixId}Popover`);
        popover.getAggregation("content")[0].setBusy(true);     
        const messages=await cpi.getlastestMessage(flowId,fromDate,toDate);
        const messageModel=new JSONModel(messages.d.results);
        popover.setModel(messageModel);
        popover.getAggregation("content")[0].setBusy(false);
    }

    window.addEventListener("OpenEditor",async(event)=>{
        if (constants.whereOpenEditor.test(event.detail.clicked)){ 
            const oControl=sap.ui.getCore().byId(event.detail.clicked.split("-")[0]);
            if (oControl){
                const busyDialog=new BusyDialog();
                busyDialog.open();
                let payload;
                if (oControl instanceof sap.m.MessageStrip)
                    payload=await cpi.getPayloadTrace(oControl.getModel().getProperty("/currTrace/id"));
                else
                    payload=oControl instanceof Text?oControl.getProperty("text"):oControl.getProperty("value");
                openEditorDialog(payload);
                busyDialog.close();
                busyDialog.destroy();
            }
        }
    });    

    window.onbeforeunload=(event)=>{
        if ($.sap.busy){        
            event.returnValue = true;
            event.preventDefault();
        }
    }
    return {
        usedList:()=>{
            let dialog=sap.ui.getCore().byId(`${constants.prefixId}usedListDialog`);
            if (!dialog){
                dialog=new Dialog(`${constants.prefixId}usedListDialog`,{
                    title: `Where-Used List`,
                    contentWidth: "50%",        
                    contentHeight:"50%",
                    verticalScrolling:true,
                    content: [
                        new VBox({
                            items:[
                                new HBox({
                                    items:[
                                        new InputListItem({
                                            label:"Word to find",
                                            content:[
                                                new Input({
                                                    type:"Text",                                                    
                                                    liveChange:(event)=>{
                                                        if (event.getSource().getValue()=="")
                                                            event.getSource().getParent().getParent().getAggregation("items")[2].setProperty("enabled",false);
                                                        else
                                                            event.getSource().getParent().getParent().getAggregation("items")[2].setProperty("enabled",true);
                                                    }
                                                })
                                            ]
                                        }),
                                        new InputListItem({
                                            label:"Include references",
                                            content:[
                                                new CheckBox()
                                            ]
                                        }),
                                        new Button({
                                            text:"Search",
                                            enabled:false,
                                            press:(event)=>{
                                                let oModel=new JSONModel([]);
                                                sap.ui.getCore().byId(`${constants.prefixId}usedListDialog`).setModel(oModel);
                                                event.getSource().setProperty("enabled",false);
                                                const indicator=event.getSource().getParent().getParent().getAggregation("items")[1];
                                                const ProgressIndicator=(event)=>{        
                                                    event.detail.percentage = Math.round(event.detail.percentage);                                        
                                                    sap.ui.getCore().byId(`${constants.prefixId}usedListIndicator`).setProperty("displayValue",`${event.detail.percentage}%`);
                                                    sap.ui.getCore().byId(`${constants.prefixId}usedListIndicator`).setProperty("percentValue",event.detail.percentage);
                                                    oModel=new JSONModel(event.detail.result);
                                                    sap.ui.getCore().byId(`${constants.prefixId}usedListDialog`).setModel(oModel);                                                                                         
                                                }
                                                window.addEventListener("CPI",ProgressIndicator);
                                                const world=event.getSource().getParent().getAggregation("items")[0].getAggregation("content")[0].getValue();
                                                const references=event.getSource().getParent().getAggregation("items")[1].getAggregation("content")[0].getSelected();                                                
                                                cpi.usedListObjectsCPI(world,references).then((result)=>{
                                                    oModel=new JSONModel(result);
                                                    sap.ui.getCore().byId(`${constants.prefixId}usedListDialog`).setModel(oModel);
                                                    MessageBox.information("Used list search has terminated");
                                                }).catch((error)=>{
                                                    console.log(error);                 
                                                    MessageBox.error(error);                                       
                                                }).finally(()=>{
                                                    window.removeEventListener("CPI",ProgressIndicator);
                                                    event.getSource().setProperty("enabled",true);
                                                })
                                            }
                                        })
                                    ]
                                }),
                                new ProgressIndicator(`${constants.prefixId}usedListIndicator`,{
                                    percentValue:"0",
                                    displayValue:"0%",
                                    state:"Information"
                                    
                                }),
                                new HBox({
                                    items:[
                                        new Table({
                                            columns:[
                                                new Column({
                                                    header:new Text({text:"Package"}),
                                                }),
                                                new Column({
                                                    header:new Text({text:"Iflow"}),
                                                }),
                                                new Column({
                                                    header:new Text({text:"Link"}),
                                                }),
                                            ],
                                            items:{
                                                path: "/",
                                                template:new ColumnListItem({
                                                    cells:[
                                                        new Text({text:"{package}"}),
                                                        new Text({text:"{iflow}"}),                                                    
                                                        new sap.m.Link({text:"Go to",href:"{link}",target:"_blank"})
                                                    ]
                                                })
                                            }
                                        })
                                    ]
                                })
                            ]
                        })
                    ],
                    endButton: new Button({
                        text: "Close",
                        press: ()=>{
                            dialog.close();
                        }
                    })
                });            
            }            
            dialog.open();
        },
        activateTrace:async (event)=>{            
            const id=event.getSource().getModel().oData.defaultIntegrationFlowModel.allAttributes.bundleId.value;
            const {runtimeLocationId}=await cpi.getFlowId(id);            
            if (await cpi.activeTrace(id,runtimeLocationId)==200)
                MessageBox.information('Trace has been activated successful');
            else
                MessageBox.error('there is an error activing trace');            
            counterTimer = 10;
        },
        openMessages:async(event)=>{
            const flowId=event.getSource().getModel().oData.defaultIntegrationFlowModel.allAttributes.bundleId.value
            let popover=sap.ui.getCore().byId(`${constants.prefixId}Popover`);
            if (!popover){
                popover=new sap.m.Popover(`${constants.prefixId}Popover`,{
                    title: `Latest messages`,
                    placement:"Bottom",
                    contentWidth: "550px",
                    contentHeight:"650px",                
                    content:[                    
                        new Table({
                                columns:[
                                    new Column({
                                        header:new Text({text:"Date time"}),
                                    }),
                                    new Column({
                                        header:new Text({text:"Time"}),
                                    }),
                                    new Column({
                                        header:new Text({text:"Status"}),
                                    }),
                                    new Column({
                                        header:new Text({text:"Log level"}),
                                    }),
                                    new Column({
                                        header:new Text({text:"Tools"}),
                                    })
                                ],
                                items:{
                                    path: "/",
                                    template:new ColumnListItem({
                                        cells:[
                                            new Text({text:"{LogStart}"}),
                                            new Text({text:"{Time}"}),
                                            new ObjectStatus({state:"{state}",text:"{Status}",tooltip:"{error}"}),
                                            new Text({text:"{LogLevel}"}),
                                            new HBox({
                                                items:[
                                                    new Button({enabled:"{enabled}",tooltip:"Draw trace",icon:"sap-icon://chevron-phase-2",press:openTrace}),                                                                                                        
                                                    new Button({tooltip:"Open trace",icon:"sap-icon://slim-arrow-right",press:cpi.openTrace}),
                                                    new Button({tooltip:"Open trace details",icon:"sap-icon://open-command-field",press:cpi.openTraceDetails})
                                                ]
                                            })
                                        ]
                                    })
                                }
                            },
                        )],
                    customHeader: new VBox({
                        items:[
                            new HBox({
                                items:[
                                    new InputListItem({
                                        label:"Time:",
                                        content:[
                                            new Select(`${constants.prefixId}_selectDates`,{
                                                items: {
                                                    path: "timeFilter>/items",
                                                    template: new sap.ui.core.Item({
                                                        key: "{timeFilter>key}",
                                                        text: "{timeFilter>text}"
                                                    })
                                                },
                                                change:(event)=>{
                                                    const {fromDate,toDate}=utils.calculateRangeDate(event.getSource().getSelectedKey());                                                          
                                                    getlastestMessage(flowId,fromDate,toDate);
                                                }
                                            }),
                                            new Button({
                                                text: "Refresh",
                                                icon:"sap-icon://refresh",
                                                press:()=>{    
                                                    const dates=sap.ui.getCore().byId(`${constants.prefixId}_selectDates`).getSelectedKey();
                                                    const {fromDate,toDate}=utils.calculateRangeDate(dates?dates:"PastHour");                                                   
                                                    getlastestMessage(flowId,fromDate,toDate);                                
                                                }                                
                                            }),
                                            new Button({
                                                text: "Clear",
                                                icon:"sap-icon://clear-all",
                                                press: ()=>{        
                                                    clearTrace();
                                                }                                
                                            }),
                                            new Button({
                                                text: "Open Messages",
                                                icon:"sap-icon://open-command-field",
                                                press: ()=>{        
                                                    cpi.openLogTab(flowId,sap.ui.getCore().byId(`${constants.prefixId}_selectDates`).getSelectedKey());                              
                                                }
                                            }),
                                            new Button({                                                
                                                icon:"sap-icon://navigation-right-arrow",
                                                press: (event)=>{                                                          
                                                    const visible=sap.ui.getCore().byId(`${constants.prefixId}hboxAttach`).getVisible();
                                                    sap.ui.getCore().byId(`${constants.prefixId}hboxAttach`).setVisible(visible?false:true);
                                                    event.getSource().setIcon(visible?'sap-icon://navigation-right-arrow':'sap-icon://navigation-left-arrow')
                                                }
                                            })
                                        ]
                                    })                                    
                                ]
                            }),
                            new HBox(`${constants.prefixId}hboxAttach`,{
                                visible:false,
                                items:[
                                    new InputListItem(`${constants.prefixId}_findAttachment`,{
                                        label:"Find in attachments:",
                                        content:[
                                            new Input({
                                                type:"Text",  
                                                width:"80px",                                                                                      
                                                liveChange:(event)=>{
                                                    if (event.getSource().getValue()=="")
                                                        event.getSource().getParent().getParent().getAggregation("items")[1].setProperty("enabled",false);
                                                    else
                                                        event.getSource().getParent().getParent().getAggregation("items")[1].setProperty("enabled",true);
                                                }
                                            })                                            
                                        ]
                                    }),
                                    new Button({
                                        enabled:false,
                                        text: "Search",
                                        press:async(event)=>{
                                            const popover=sap.ui.getCore().byId(`${constants.prefixId}Popover`);
                                            popover.getAggregation("content")[0].setBusy(true);
                                            const dates=sap.ui.getCore().byId(`${constants.prefixId}_selectDates`).getSelectedKey();
                                            const {fromDate,toDate}=utils.calculateRangeDate(dates?dates:"PASTHOUR");                                                          
                                            const messages=await cpi.getlastestMessage(flowId,fromDate,toDate);
                                            cpi.findInAttachment(messages,event.getSource().getParent().getAggregation("items")[0].getAggregation("content")[0].getValue()).then((result)=>{
                                                const messageModel=new JSONModel(messages.d.results);
                                                popover.setModel(messageModel);                                                
                                            }).catch((error)=>{
                                                console.log(error);                 
                                                MessageBox.error(error);                                       
                                            }).finally(()=>{
                                                popover.getAggregation("content")[0].setBusy(false);
                                            })
                                        }
                                    })
                                ]
                            })
                        ]
                    })                    
                });
                popover.setModel(new JSONModel({
                    items: [
                        { key: "PASTMIN", text: "Past Minute" },
                        { key: "PASTHOUR", text: "Past Hour" },
                        { key: "PAST24", text: "Past 24 Hours" },
                        { key: "PASTWEEK", text: "Past Week" },
                        { key: "PASTMONTH", text: "Past Month" }                        
                    ]
                }),"timeFilter");
                sap.ui.getCore().byId(`${constants.prefixId}_selectDates`).setSelectedKey("PASTHOUR");
            }        
            popover.openBy(event.getSource());
            const dates=sap.ui.getCore().byId(`${constants.prefixId}_selectDates`).getSelectedKey();
            const {fromDate,toDate}=utils.calculateRangeDate(dates?dates:"PASTHOUR");                                                          
            getlastestMessage(flowId,fromDate,toDate);       
            
        },     
        info:(event)=>{         
            let quickViewInfo=sap.ui.getCore().byId(`${constants.prefixId}QuickView`);
            if (!quickViewInfo){
                quickViewInfo = new QuickView(`${constants.prefixId}QuickView`,{
                    placement:"Left",
                    pages:[
                        new QuickViewPage({
                            header:"Information",
                            groups:[
                                new QuickViewGroup({
                                    elements:{
                                        path:"/",
                                        template:
                                                new QuickViewGroupElement({
                                                    label:"{label}",
                                                    value:"{value}",
                                                    url:"{url}",
                                                    type:"{elementType}",
                                                    pageLinkId:"{pageLinkId}",
                                                    emailSubject:"{emailSubject}",
                                                    target:"{target}"
                                                })                                            
                                        }                                                 
                                })
                            ]
                            }
                        )
                    ]
                });                
            }
            quickViewInfo.setModel(event.getSource().getModel("infoIflow"));
            quickViewInfo.openBy(event.getSource());
        },      
        viewDetailsCredential:async(event)=>{
            $.sap.busy=true;
            const busyDialog=new BusyDialog(`${constants.prefixId}busyDialog`,{
                title:"Credential details",
                text:"wait..."
            });
            busyDialog.open();
            const updateText=(event)=>{
                busyDialog.setText(event.detail.message);
            }            
            window.addEventListener("CPI",updateText);
            const id=event.getSource().getModel().getProperty("name",event.getSource().getBindingContext());            
            const details=await cpi.getSecurityMaterialSimulate(id);
            busyDialog.close();
            window.removeEventListener("CPI",updateText);
            busyDialog.destroy();
            if (details==null){
                MessageToast.show("Error cannot get credential");
            }
            else{
                const jsonDetails = [];
                for(const detail of Object.entries(details)){
                    if (!["CamelMessageHistory","CamelToEndpoint","artifact.description"].includes(detail[0]))
                    jsonDetails.push({
                        key:detail[0],
                        value:detail[1]
                    })
                }
                const jModelDetails=new JSONModel(jsonDetails);
                const dialog=new Dialog(`${constants.prefixId}Dialog`,{
                    title: `Credential details - ${id}`,
                    contentWidth: "500px",                
                    content: new Table({
                                columns:[
                                    new Column({
                                        header:new Text({text:"Property"}),
                                    }),
                                    new Column({
                                        header:new Text({text:"Value"}),
                                    })
                                ],
                                items:{
                                    path: "/",
                                    template:new ColumnListItem({
                                        cells:[
                                            new Text({text:"{key}"}),
                                            new Text({text:"{value}"})
                                        ]
                                    })
                                }
                            }
                    ),
                    endButton: new Button({
                        text: "Close",
                        press: ()=>{
                            dialog.close();
                            dialog.destroy();                        
                        }
                    })
                });
                dialog.setModel(jModelDetails);
                dialog.open();
            }
            $.sap.busy=false;
            return details;
        },
        viewNanageKeystore:(event)=>{
            //openssl pkcs12 -export -out Cert.p12 -in cert.pem -inkey key.pem -passin pass:root -passout pass:root 
            $.sap.busy=true;
            const dialog=new Dialog(`${constants.prefixId}dialog`,{                
                title: "Confirm",
                content: new Text({ text: "How would you like to download the certificate?" }),
                beginButton: new Button({                    
                    text: "One File",
                    press: function () {                        
                        dialog.close();
                        dialog.destroy();
                        downloadFIle(1);
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Two file",
                    press: function () {
                        dialog.close();
                        dialog.destroy();
                        downloadFIle(2);
                    }.bind(this)
                })
            });
            dialog.open();
            const downloadFIle=async(files)=>{
                const busyDialog=new BusyDialog(`${constants.prefixId}busyDialog`,{
                    title:"Download key pair",
                    text:"wait..."
                });
                busyDialog.open();
                const updateText=(event)=>{
                    busyDialog.setText(event.detail.message);
                }            
                window.addEventListener("CPI",updateText);
                const id=event.getSource().getModel("FromOData").getProperty("Alias",event.getSource().getBindingContext("FromOData"));
                const details=await cpi.getkeyPairSimulate(id);                
                busyDialog.close();
                window.removeEventListener("CPI",updateText);
                busyDialog.destroy();
                if (details==null){
                    MessageToast.show("Error cannot get keypair");
                }
                else{
                    if (files==1){
                        const file=`-----BEGIN PRIVATE KEY-----\n${details.key}\n-----END PRIVATE KEY-----\n-----BEGIN CERTIFICATE-----\n${details.cert}\n-----END CERTIFICATE-----`;
                        const blob = new Blob([file], { type: 'text/plain' });            
                        const link = document.createElement('a');            
                        link.download = `${details.keyPairName}.pem`;            
                        link.href = URL.createObjectURL(blob);            
                        document.body.appendChild(link);            
                        link.click();            
                        document.body.removeChild(link);
                    }
                    else{
                        const key=`-----BEGIN PRIVATE KEY-----\n${details.key}\n-----END PRIVATE KEY-----`;
                        const cert=`-----BEGIN CERTIFICATE-----\n${details.cert}\n-----END CERTIFICATE-----`;
                        const blobKey = new Blob([key], { type: 'text/plain' });            
                        const blobCert = new Blob([cert], { type: 'text/plain' });            
                        let link = document.createElement('a');            
                        link.download = `${details.keyPairName}_key.pem`;            
                        link.href = URL.createObjectURL(blobKey);            
                        document.body.appendChild(link);            
                        link.click();            
                        document.body.removeChild(link);
                        link = document.createElement('a');            
                        link.download = `${details.keyPairName}_cert.pem`;            
                        link.href = URL.createObjectURL(blobCert);            
                        document.body.appendChild(link);            
                        link.click();            
                        document.body.removeChild(link);
                    }
                }
            }
            $.sap.busy=false;    
        },
        updateTraceStatus:(id,iflowId)=>{            
                updateTraceStatusTImer(id,iflowId);
        }
    };
});