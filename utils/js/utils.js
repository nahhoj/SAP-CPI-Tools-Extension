sap.ui.loader.config({
    paths: {
        'constants': `${$.sap.chromeExtensionURL}utils/js/constants`
    }
});

sap.ui.define([
    "constants"
], function(constants) {
    "use strict";
    console.log("Start util script");   
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // These functions for pretty-printing XML and JSON were taken from https://github.com/vkiryukhin/pretty-data.
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const prettyXML=(text)=>{
        const shift = ['\n']; // array of shifts
        const step = '  '; // 2 spaces
        for(ix=0;ix<100;ix++){
            shift.push(shift[ix]+step);
        }
        var ar = text.replace(/>\s{0,}</g,"><")
                        .replace(/</g,"~::~<")
                        .replace(/xmlns\:/g,"~::~xmlns:")
                        .replace(/xmlns\=/g,"~::~xmlns=")
                        .split('~::~'),
            len = ar.length,
            inComment = false,
            deep = 0,
            str = '',
            ix = 0;
    
            for(ix=0;ix<len;ix++) {
                // start comment or <![CDATA[...]]> or <!DOCTYPE //
                if(ar[ix].search(/<!/) > -1) {
                    str += shift[deep]+ar[ix];
                    inComment = true;
                    // end comment  or <![CDATA[...]]> //
                    if(ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1 || ar[ix].search(/!DOCTYPE/) > -1 ) {
                        inComment = false;
                    }
                } else
                // end comment  or <![CDATA[...]]> //
                if(ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1) {
                    str += ar[ix];
                    inComment = false;
                } else
                // <elm></elm> //
                if( /^<\w/.exec(ar[ix-1]) && /^<\/\w/.exec(ar[ix]) &&
                    /^<[\w:\-\.\,]+/.exec(ar[ix-1]) == /^<\/[\w:\-\.\,]+/.exec(ar[ix])[0].replace('/','')) {
                    str += ar[ix];
                    if(!inComment) deep--;
                } else
                    // <elm> //
                if(ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) == -1 && ar[ix].search(/\/>/) == -1 ) {
                    str = !inComment ? str += shift[deep++]+ar[ix] : str += ar[ix];
                } else
                    // <elm>...</elm> //
                if(ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) > -1) {
                    str = !inComment ? str += shift[deep]+ar[ix] : str += ar[ix];
                } else
                // </elm> //
                if(ar[ix].search(/<\//) > -1) {
                    str = !inComment ? str += shift[--deep]+ar[ix] : str += ar[ix];
                } else
                // <elm/> //
                if(ar[ix].search(/\/>/) > -1 ) {
                    str = !inComment ? str += shift[deep]+ar[ix] : str += ar[ix];
                } else
                // <? xml ... ?> //
                if(ar[ix].search(/<\?/) > -1) {
                    str += shift[deep]+ar[ix];
                } else
                // xmlns //
                if( ar[ix].search(/xmlns\:/) > -1  || ar[ix].search(/xmlns\=/) > -1) {
                    str += shift[deep]+ar[ix];
                }
    
                else {
                    str += ar[ix];
                }
            }
    
        return  (str[0] == '\n') ? str.slice(1) : str;
    }
    const prettyJSON=(text)=>{
        const step = '  ';
        if ( typeof text === "string" ) {
            return JSON.stringify(JSON.parse(text), null, step);
        }
        if ( typeof text === "object" ) {
            return JSON.stringify(text, null, step);
        }
        return null;
    }
    return {
        getRandomText:(length)=>{
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const charactersLength = characters.length;
            let counter=0;
            let result="STE_";
            while (counter < length) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
                counter += 1;
            }
            return result;
        },        
        base64ToBlob:(base64, contentType, sliceSize = 512)=>{
            const byteCharacters = atob(base64);    
            const byteArrays = [];
        
            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);
        
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
        
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
        
            const blob = new Blob(byteArrays, { type: contentType });
            return blob;
        },
        getEnvVariable:async(variable)=>{
            let iflow64;
            let env=await fetch(constants.iflow64Path);
            env = await env.text()
            env.split(/\r?\n/).forEach(line => {
                if (line.includes(variable)){
                    iflow64=line.split("=")[1]
                }
            });
            return iflow64;
        },
        fireEvent:(name,detail)=>{
            const event = new CustomEvent(name,{detail});
            this.dispatchEvent(event);    
        },
        prettyPrint:(text)=>{
            try {
                return {textFormat:prettyJSON(text),type:"json"}
            } catch (error) {
                return {textFormat:prettyXML(text),type:"xml"}
            }
        },
        calculateRangeDate:(Latest)=>{
            let fromDate;
            let toDate=new Date();
            switch(Latest) {
                case "PASTMIN":
                    fromDate=new Date().setMinutes(new Date().getMinutes() - 1);
                    break;
                case "PASTHOUR":
                    fromDate=new Date().setHours(new Date().getHours() - 1);                                                     
                    break;
                case "PAST24":
                    fromDate=new Date().setDate(new Date().getDate() - 1);
                break;
                case "PASTWEEK":
                    fromDate=new Date().setDate(new Date().getDate() - 7);
                break;
                case "PASTMONTH":
                    fromDate=new Date().setMonth(new Date().getMonth() - 1);
                break;                                                                                    
            }            
            //fromDate=date2String(new Date(fromDate));
            //toDate=date2String(new Date(toDate));
            fromDate=new Date(fromDate).toISOString().replace("Z","");
            toDate=new Date(toDate).toISOString().replace("Z","");
            return {fromDate,toDate}           
        }
    };
});