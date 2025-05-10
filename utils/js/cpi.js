sap.ui.loader.config({
    paths: {
        'constants': `${$.sap.chromeExtensionURL}utils/js/constants`,
        'net': `${$.sap.chromeExtensionURL}utils/js/net`,
        'utils': `${$.sap.chromeExtensionURL}utils/js/utils`
    }
});

sap.ui.define([
    "constants",
    "net",
    "utils"
], function(constants,net,utils) {
    "use strict";
    console.log("Start cpi script");

    const createPackage=async (packageName)=>{
        let url=`${constants.apiBaseURLCPI}${constants.serviceURL.ContentPackages}`;
        let packageId;
        const headers=[
            {"Content-Type":"application/json"},
            {"Accept":"application/json"}
        ]
        const body=`{
            "Category": "Integration",
            "SupportedPlatforms": "SAP HANA Cloud Integration",
            "TechnicalName": "${packageName}",
            "DisplayName": "${packageName}",
            "ShortText": "${packageName}"
        }`;
        let response;
        try {
            response=await net.callService(url,"POST",headers,body,true);
            packageId = packageId = JSON.parse(response.body).d.reg_id;
        } catch (error) {
            if (error.status == 409){
                url+=`?$filter=TechnicalName eq '${packageName}'`;
                try {
                    response=await net.callService(url,"GET",headers,null,false);
                    packageId = JSON.parse(response.body).d.results[0].reg_id;
                } catch (error) {}
            }
        }
        return packageId;
    }

    const deletePackage=async (packageName)=>{
        let url=`${constants.apiBaseURLCPI}${constants.serviceURL.ContentPackages}('${packageName}')`;
        const headers=[
            {"Content-Type":"application/json"},
            {"Accept":"application/json"}
        ]
        try {
            await net.callService(url,"DELETE",headers,null,true);
            return true;    
        } catch (error) {
            return false;   
        }
    }

    const uploadIflow=async(iflow64,packageId,packageName,iflowName)=>{
        let iflowId;
        let url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiWorkspace}/${packageId}/iflows`;
        let formData = new FormData();  
        const fileBlob=utils.base64ToBlob(iflow64,"application/x-zip-compressed");
        formData.append("__xmlview4--iflowBrowse",fileBlob,`${iflowName}.zip`);
        formData.append("_charset_","UTF-8");
        const data=`{
                        "name": "${iflowName}",
                        "description": "",
                        "type": "IFlow",
                        "id": "${iflowName}",
                        "additionalAttrs": {
                            "source": [],
                            "target": [],
                            "productProfile": [
                                "iflmap"
                            ],
                            "nodeType": [
                                "IFLMAP"
                            ]
                        },
                        "packageId": "${packageName}",
                        "fileName": "${iflowName}.zip"
                    }`;
        formData.append("__xmlview4--iflowBrowse-data",data);
        let response;
        try {
            response = await net.callService(url,"POST",[],formData,true);
            iflowId = JSON.parse(response.body).id;
        } catch (error) {}
        return iflowId;
    }

    const simulateIflow=async(packageId,iflowId,iflowName,properties,SequenceFlowStart,SequenceFlowEnd)=>{
        return new Promise(async (resolve,reject)=>{
            let metadata;
            let url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiWorkspace}/${packageId}/artifacts/${iflowId}/entities/${iflowId}/iflows/${iflowName}`;
            const headers=[
                {"Content-Type":"application/json"},
                {"Accept":"application/json"}
            ]
            let response;
            try {
                response = await net.callService(url,"GET",headers,null,false);    
            } catch (error) {
                reject(null);
            }        
            metadata=response.body;
            let simulateId=new Date().getTime();
            url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiWorkspace}/${packageId}/artifacts/${iflowId}/entities/${iflowId}/iflows/${iflowName}/simulations?id=${simulateId}&isReadMode=true&webdav=SIMULATE`;
            const body=`{
                    "startSeqID": "${SequenceFlowStart}",
                    "endSeqID": "${SequenceFlowEnd}",
                    "process": "Process_1",
                    "inputPayload": {
                        "properties": ${properties},
                        "body": null
                    },
                    "mockPayloads": {},
                    "traceCache": {},
                    "iflowModelTO":${metadata}}`;
            try {
                response = await net.callService(url,"PUT",headers,body,true);    
            } catch (error) {
                reject(null);
            }
            const stepTestTaskId=JSON.parse(response.body).stepTestTaskId;
            url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiWorkspace}/${packageId}/artifacts/${iflowId}/entities/${iflowId}/iflows/${iflowName}/simulations/${stepTestTaskId}?id=${simulateId}`;
            let couterTimeOut=0;
            setTimeout(async function again(){
                let response;
                try {
                    response = await net.callService(url,"GET",headers,null,false);    
                } catch (error) {
                    reject(null);
                }              
                if (JSON.parse(response.body).percentageComplete == '100'){
                    if (JSON.parse(response.body).statusCode != "TEST_EXECUTION_FAILED")
                        resolve(JSON.parse(response.body).traceData[`${SequenceFlowEnd}`].tracePages["1"].properties);
                    else
                        reject(null);
                }else{
                    if (couterTimeOut<=100){
                        couterTimeOut++
                        setTimeout(again, 500);
                    }
                    else
                        reject(null);
                }
            }, 1500);
        });
    }      
    return {      
        getUserLogin:async()=>{
            const url=`${constants.apiBaseURLCPI}/api/1.0/user`;
            let response;
            try {
                response=await net.callService(url,"GET",[],null,false);
                return JSON.parse(response.body)[0].Email;
            } catch (error) {
                return null;   
            }   
        },  
        openLogTab:(iflowName,time)=>{            
            const url = `${constants.apiBaseURLCPI}/shell/monitoring/Messages/{"status":"ALL","artifact":"${iflowName}","time":"${time}","useAdvancedFields":false}`;
            window.open(url,'_blank');
        },
        openTraceDetails:async(event)=>{            
            const messageGuid=event.getSource().getModel().getProperty("MessageGuid",event.getSource().getBindingContext());
            let url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogs('${messageGuid}')/Runs?$format=json`; 
            const response= await net.callService(url,"GET",[],null,false);
            const id=JSON.parse(response.body).d.results[0].Id;
            url = `${constants.apiBaseURLCPI}/shell/monitoring/MessageProcessingRun/{"parentContext":{"MessageMonitor":{"artifactKey":"__ALL__MESSAGE_PROVIDER","artifactName":"All%20Artifacts"}},"messageProcessingLog":"${messageGuid}","RunId":"${id}"}`;
            window.open(url,'_blank');
        },
        openTrace:(event)=>{
            const messageGuid=event.getSource().getModel().getProperty("MessageGuid",event.getSource().getBindingContext());
            let url=`${constants.apiBaseURLCPI}/shell/monitoring/Messages/{"identifier":"${messageGuid}"}`;
            window.open(url,'_blank');
        },
        getTraceSteps:async(messageGuid)=>{                
            let url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogs('${messageGuid}')/Runs?$format=json`; 
            let response;
            let steps=[];
            try{
                response = await net.callService(url,"GET",[],null,false);
                let responseJson=JSON.parse(response.body);
                const id=responseJson.d.results[0].Id;
                const top=1000;
                let skip=0;
                let count=1001;                
                for(let counter=0;counter<=count;counter+=top){
                    url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogRuns('${id}')/RunSteps?$inlinecount=allpages&$top=${top}&$skip=${skip}&$format=json`;
                    response = await net.callService(url,"GET",[],null,false);
                    steps.push(JSON.parse(response.body).d.results);
                    count=parseInt(JSON.parse(response.body).d.__count);
                    skip+=top;
                }                
            }
            catch(error){}
            return steps;
        },
        getTraceContent:async(runId,ChildCount,subStep)=>{
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogRunSteps(RunId='${runId}',ChildCount=${ChildCount})/TraceMessages?$format=json`; 
            let response;
            const header=[];
            const property=[];
            let body="";    
            let count=0;    
            let traceId=0;    
            try {
                response = await net.callService(url,"GET",[],null,false);
                traceId=JSON.parse(response.body).d.results[subStep].TraceId;
                count=JSON.parse(response.body).d.results.length;
                const urlHeader=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/TraceMessages(${traceId}L)/Properties?$format=json`; 
                const urlProperty=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/TraceMessages(${traceId}L)/ExchangeProperties?$format=json`; 
                const urlbody=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/TraceMessages(${traceId}L)/$value`;
                response = await net.callService(urlHeader,"GET",[],null,false);
                const headers=JSON.parse(response.body).d.results;
                for(const _header of headers){
                    header.push({
                        name:_header.Name,
                        value:_header.Value
                    })
                }
                response = await net.callService(urlProperty,"GET",[],null,false);
                const properties=JSON.parse(response.body).d.results;
                for(const _property of properties){
                    property.push({
                        name:_property.Name,
                        value:_property.Value
                    })
                }                
                response = await net.callService(urlbody,"GET",[],null,false);
                body=response.body;
            }
            catch(error){}
            return {header,property,body,count,traceId}
        },
        getTraceCount:async(runId,ChildCount)=>{
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogRunSteps(RunId='${runId}',ChildCount=${ChildCount})/TraceMessages?$format=json`;         
            let count=0;
            try {
                const response = await net.callService(url,"GET",[],null,false);
                count=JSON.parse(response.body).d.results.length;
            }
            catch(error){
                count=0;
            }
            return count
        },
        getTraceDownload:async(traceId)=>{
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.downloadTraceFile}?traceIds=${traceId}`;       
            let fileContent64;              
            try {
                const response = await net.callService(url,"GET",[],null,false);                
                const parser = new DOMParser();
                const xml = parser.parseFromString(response.body, "application/xml");      
                fileContent64=xml.querySelectorAll("payload")[0]?.textContent                
            }
            catch(error){}
            return fileContent64;
        },
        activeTrace:async (idFlow,runtimeLocationId)=>{
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.logLevel}`;
            const body=`{"artifactSymbolicName":"${idFlow}","mplLogLevel":"TRACE","nodeType":"IFLMAP","runtimeLocationId": "${runtimeLocationId}"}`
            let headers=[{"Content-Type":"application/json"}];
            let status;
            try {
                const response = await net.callService(url,"POST",headers,body,true);
                status = response.status;
            } catch (error) {
                status = error.status;
            }   
            return status;
        },
        getPayloadTrace:async(id)=>{
            let payload;
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/TraceMessages(${id}L)/$value`;
            try {
                const response = await net.callService(url,"GET",[],null,false);
                payload=response.body;
            } catch (error) {
                payload="";
            }   
            return payload;
        },
        getFlowId:async (iflowName)=>{            
            let id=null;
            let runtimeLocationId=null;
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.listIflow}`;
            let response;
            try {
                response=await net.callService(url,"GET",[],null,false);
            } catch (error) {
                return id;
            }    
            const parser = new DOMParser();
            const xml = parser.parseFromString(response.body, "application/xml");            
            for(const artifactInformation of xml.querySelectorAll("artifactInformations")){
                if (artifactInformation.querySelector("symbolicName").textContent == iflowName)
                    id=artifactInformation.querySelector("id").textContent;
                    runtimeLocationId=artifactInformation.querySelector("runtimeLocationId")?.textContent;
            }
            return {id,runtimeLocationId};
        },
        getIflowSTraceStatus:async(id,runtimeLocationId)=>{            
            let status,traceExpires,deployState,state,logLevel;
            let endPointInfo=[];
            let packageInfo=[];
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.listDetailsIflow}?artifactId=${id}&runtimeLocationId=${runtimeLocationId}`;            
            let response;
            try {
                response=await net.callService(url,"GET",[],null,false);
                const parser = new DOMParser();
                const xml2 = parser.parseFromString(response.body, "application/xml");
                status = xml2.querySelector("traceActive").textContent;
                deployState = xml2.querySelector("deployState").textContent;
                state = xml2.querySelector("state").textContent;
                logLevel = xml2.querySelector("logLevel").textContent;
                if (xml2.querySelector("traceExpiresAt"))
                    traceExpires = xml2.querySelector("traceExpiresAt").textContent;
                if (xml2.querySelector("endpointInstances")){                
                    for(const endpoint of xml2.querySelectorAll("endpointInstances")){
                        endPointInfo.push({"endpointCategory":endpoint.attributes.endpointCategory.value,"endpointUrl":endpoint.attributes.endpointUrl.value});
                    }
                }
                if (xml2.querySelector("typeSpecificTags")){
                    for(const typeSpecificTag of xml2.querySelectorAll("typeSpecificTags")){
                        if (["artifact.package.id","artifact.package.name"].includes(typeSpecificTag.attributes.name.value))
                            packageInfo.push({"name":typeSpecificTag.attributes.name.value,"value":typeSpecificTag.attributes.value.value});
                    }
                }
            } catch (error) {}           
            return {status,traceExpires,endPointInfo,packageInfo,deployState,state,logLevel}
        },
        getDeployIflows:async()=>{
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.listIflow}`;
            let response;
            try {
                response=await net.callService(url,"GET",[],null,false);    
            } catch (error) {
                return null;   
            }
            const parser = new DOMParser();
            const xml = parser.parseFromString(response.body, "application/xml");
            //return xml.querySelectorAll("name");
            const artifactInformations=xml.querySelectorAll("artifactInformations");
            const grouped = Array.from(artifactInformations).map(artifactInformation => {
                return { name:artifactInformation.querySelector("symbolicName"), semanticState:artifactInformation.querySelector("semanticState") };
            });
            return grouped;
        },    
        getPackage:async(iflowId)=>{
            let packageInfo=[];
            const url=`${constants.apiBaseURLCPI}${constants.serviceURL.ContentPackages}?$expand=Artifacts&$format=json`;
            let response;
            try {
                response=await net.callService(url,"GET",[],null,false);    
                const responseJson=JSON.parse(await response.body);
                for(const pack of responseJson.d.results){
                    for(const Artifact of pack.Artifacts.results){
                        if (Artifact.Name == iflowId){
                            packageInfo.push({"name":"artifact.package.name","value":pack.DisplayName});
                            packageInfo.push({"name":"artifact.package.id","value":pack.TechnicalName});
                            break;
                        }
                    }
                }
            } catch (error) {
                return packageInfo;   
            }
            return packageInfo;
        },
        getlastestMessage:async(flowId,fromDate,toDate)=>{                 
            //let url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogs?$select=MessageGuid,LogStart,LogEnd,Status,LogLevel&$filter=IntegrationArtifact/Id eq '${flowId}' and (Status ne 'ABANDONED' and Status ne 'DISCARDED')&$orderby=LogEnd desc&$format=json&$top=50`;            
            let url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogs?$select=MessageGuid,LogStart,LogEnd,Status,LogLevel&$filter=LogEnd ge datetime'${fromDate}' and LogStart le datetime'${toDate}' and IntegrationArtifact/Id eq '${flowId}' and (Status ne 'ABANDONED' and Status ne 'DISCARDED')&$orderby=LogEnd desc&$format=json`;
            let responseJson={};
            try {
                let response=await net.callService(url,"GET",[],null,false);
                responseJson=JSON.parse(response.body);
                for (let message of responseJson.d.results){
                    if (message.Status == "FAILED"){
                        url=`${constants.apiBaseURLCPI}${constants.serviceURL.logInfo}?messageGuid=${message.MessageGuid}`;         
                        response=await net.callService(url,"GET",[],null,false);        
                        const parser = new DOMParser();
                        const xml = parser.parseFromString(response.body, "application/xml");
                        const error=xml.querySelector("lastError");
                        if (error!=null)
                            message.error = error.textContent;
                    }
                    message.state = message.Status == "FAILED" ? "Error" : "Success";
                    message.enabled = message.LogLevel == "TRACE" || message.Status == "FAILED" ? true : false;
                    message.LogStart = new Date(parseInt(message.LogStart.replace("/Date(","").replace(")/","")));
                    message.LogEnd = new Date(parseInt(message.LogEnd.replace("/Date(","").replace(")/","")));
                    message.Time = message.LogEnd - message.LogStart;  
                    const hours = Math.floor(message.Time / (1000 * 60 * 60));
                    message.Time -= hours * (1000 * 60 * 60);                  
                    const minutes = Math.floor(message.Time / (1000 * 60));
                    message.Time -= minutes * (1000 * 60);                  
                    const seconds = Math.floor(message.Time / 1000);
                    const milliseconds = message.Time - seconds * 1000;
                    let result = '';
                    if (hours > 0)
                        result += `${hours} h `;

                    if (minutes > 0 || hours > 0)
                        result += `${minutes} min `;

                    if (seconds > 0 || (hours === 0 && minutes === 0 && seconds > 0))
                        result += `${seconds} sec `;

                    if (milliseconds > 0 || (hours === 0 && minutes === 0 && seconds === 0)) 
                        result += `${milliseconds} ms`;
                    
                    message.Time = result;
                    message.LogStart = `${String(message.LogStart.getFullYear())}-${String(message.LogStart.getMonth() + 1).padStart(2,"0")}-${String(message.LogStart.getDate()).padStart(2,"0")} ${String(message.LogStart.getHours()).padStart(2,"0")}:${String(message.LogStart.getMinutes()).padStart(2,"0")}:${String(message.LogStart.getSeconds()).padStart(2,"0")}`;
                }
            } catch (error) {
                return responseJson;   
            }
            return responseJson;
        },
        getSecurityMaterialSimulate:async(securityMaterialName)=>{
            let password;
            const packageName=utils.getRandomText(10);
            const iflowName = utils.getRandomText(10);
            const iflow64 = await utils.getEnvVariable("credentialIflow");
            utils.fireEvent("CPI",{message:'Creating package...'});
            const packageId=await createPackage(packageName); 
            if (!packageId){        
                return null;
            }
            utils.fireEvent("CPI",{message:'Uploading iflow...'});
            const iflowId=await uploadIflow(iflow64,packageId,packageName,iflowName);
            if (!iflowId){
                await deletePackage(packageName);
                return null;
            }   
            let propertiesOut=null;
            let propertiesIn = `{
                                    "securityMaterialName": "${securityMaterialName}"
                            }`;
            try {
                utils.fireEvent("CPI",{message:'Simulating script...'});
                propertiesOut=await simulateIflow(packageId,iflowId,iflowName,propertiesIn,"SequenceFlow_5","SequenceFlow_6");        
            } catch (error) {}
            utils.fireEvent("CPI",{message:'Deleting package...'});
            await deletePackage(packageName);    
            return propertiesOut;
        },
        getkeyPairSimulate:async(keyPairName)=>{
            const packageName=utils.getRandomText(10);
            const iflowName = utils.getRandomText(10);    
            const iflow64 = await utils.getEnvVariable("keyPairIflow");
            utils.fireEvent("CPI",{message:'Creating package...'});
            const packageId=await createPackage(packageName);    
            if (!packageId){        
                return null;
            }
            utils.fireEvent("CPI",{message:'Uploading iflow...'});
            const iflowId=await uploadIflow(iflow64,packageId,packageName,iflowName);
            if (!iflowId){
                await deletePackage(packageName);
                return null;
            }
            let propertiesOut=null;
            let propertiesIn = `{
                                    "keyPairName": "${keyPairName}"
                            }`;
            try {
                utils.fireEvent("CPI",{message:'Simulating script...'});
                propertiesOut=await simulateIflow(packageId,iflowId,iflowName,propertiesIn,"SequenceFlow_5","SequenceFlow_6");        
            } catch (error) {}   
            utils.fireEvent("CPI",{message:'Deleting package...'});
            await deletePackage(packageName);    
            return propertiesOut;
        },
        usedListObjectsCPI:(world,references)=>{
            return new Promise(async(resolve,reject)=>{
                let percentage=0;
                let result=[];
                utils.fireEvent("CPI",{percentage,state:"start"});
                const url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiWorkspace}`;
                const headers=[
                    {"Content-Type":"application/json"},
                    {"Accept":"application/json"}
                ]
                let response;
                try {
                    response = await net.callService(url,"GET",headers,null,false);    
                } catch (error) {
                    reject(error);
                }
                const packages=JSON.parse(response.body);
                const len=packages.length;
                let count=0;
                for (const packagex of packages){                
                    const url1=`${url}/${packagex.id}/artifacts`
                    try {
                        response = await net.callService(url1,"GET",headers,null,false);    
                    } catch (error) {
                        reject(error);
                    }
                    let percentageArtifacts=0;
                    const artifacts=JSON.parse(response.body);
                    const lenArtifacts=artifacts.length;
                    let countArtifacts=0;
                    for (const artifact of artifacts){
                        if (artifact.type != 'IFlow'){
                            countArtifacts++;
                            continue;
                        }
                        const url2=`${url1}/${artifact.id}/entities/${artifact.id}/iflows/${artifact.name}`;
                        try {
                            response = await net.callService(url2,"GET",headers,null,false);    
                        } catch (error) {
                            reject(error);
                        }                        
                        if (response.body.includes(world)){                            
                            result.push({
                                package:packagex.title,
                                iflow:artifact.name,
                                link:`${constants.apiBaseURLCPI}/shell/design/contentpackage/${packagex.technicalName}/integrationflows/${artifact.tooltip}`
                            })
                        }else{
                            if (references){
                                const url2=`${url1}/${artifact.id}/entities/${artifact.id}/resource?artifactType=IFlow`;
                                try {
                                    response = await net.callService(url2,"GET",headers,null,false);    
                                } catch (error) {
                                    reject(error);
                                }
                                if (response.body.includes(world)){                            
                                    result.push({
                                        package:packagex.title,
                                        iflow:artifact.name,
                                        link:`${constants.apiBaseURLCPI}/shell/design/contentpackage/${packagex.technicalName}/integrationflows/${artifact.tooltip}`
                                    })
                                }
                            }
                        }    
                        countArtifacts++;
                        percentageArtifacts=((countArtifacts/lenArtifacts)*(1/len)*100) + percentage;
                        utils.fireEvent("CPI",{percentage:percentageArtifacts,state:"process",result});
                    }
                    count++;
                    percentage=(count/len)*100;
                    utils.fireEvent("CPI",{percentage,state:"process",result});
                }
                utils.fireEvent("CPI",{percentage,state:"end"});
                resolve(result);
            })    
        },
        findInAttachment:async(messages,world)=>{
            return new Promise(async(resolve,reject)=>{
                let url;
                let response;
                let responseJson;
                let responseContent;       
                let foundMessage=[];                
                for(const message of messages.d.results){
                    url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogs('${message.MessageGuid}')/Attachments?$format=json`;
                    try {
                        response=await net.callService(url,"GET",[],null,false);    
                        responseJson=JSON.parse(response.body);
                    } catch (error) {
                        reject(err)
                    }
                    for(const attachment of responseJson.d.results){
                        url=`${constants.apiBaseURLCPI}${constants.serviceURL.apiv1}/MessageProcessingLogAttachments('${attachment.Id}')/$value`;
                        try {
                            responseContent=await net.callService(url,"GET",[],null,false);
                            if (responseContent.body?.includes(world))
                                foundMessage.push(message.MessageGuid);            
                        } catch (error) {
                            reject(err)            
                        }
                    }
                };
                messages.d.results=messages.d.results.filter(it=>foundMessage.includes(it.MessageGuid))
                resolve(messages);                
            });
  
        }
    };
});