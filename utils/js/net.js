sap.ui.loader.config({
    paths: {
        'constants': `${$.sap.chromeExtensionURL}utils/js/constants`,
    }
});

sap.ui.define([
    "constants"
], function(constants) {
    "use strict";
    console.log("Start net script")
    const getCSRFToken=(url)=>{
        let response = {};
        return new Promise((resolve,reject)=>{
            if (constants.regExpURL.detectApiCPI.test(url))
                url=constants.apiBaseURLCPI + "/api/1.0/user";
            let request=new XMLHttpRequest();   
            request.open("GET",url);
            request.setRequestHeader("X-CSRF-Token","fetch");
            request.onload=()=>{
               const CSRFToken=request.getResponseHeader("X-CSRF-Token");
               if (!CSRFToken){
                    response.status = request.status;         
                    response.errorMessage = 'Could not get CSRFToken.';       
                    reject(response);
               }
                resolve(CSRFToken);
            }
            request.onreadystatechange=()=>{
                if (request.readyState == 4 && request.status != 200){
                    response.status = request.status;         
                    response.errorMessage = 'Error calling the service get CSRFToken.';       
                    reject(response);
                }
            }
            request.send();
        });   
    }

    const callService=(url,method,headers,body,CSRFToken=false)=>{
        let response = {};
        return new Promise(async (resolve,reject)=>{
            const request =new XMLHttpRequest();
            request.open(method,url);
            headers.forEach((header) =>{
                for(const key in header){
                    request.setRequestHeader(key,header[key]);
                }
            });
            if (CSRFToken){
                let token;
                try {
                    token= await getCSRFToken(url);
                } catch (error) {
                    reject(error);
                }
                request.setRequestHeader("X-CSRF-Token",token);
            }    
            request.onload=()=>{
                response.status = request.status;
                response.body = request.responseText
                //response.headers = request.getResponseHeader();
                resolve(response);
            }
            request.onreadystatechange=()=>{
                if (request.readyState == 4 && !(request.status >=200 && request.status < 300 )){
                    response.status = request.status;         
                    response.errorMessage = 'Error calling the service.';       
                    reject(response);
                }
            }
            request.send(body);
        });  
    }
    return {getCSRFToken,callService};
});