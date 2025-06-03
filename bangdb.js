// indexedDB used to store bangs
// this way you can have custom bangs and it all Just Works(tm)
let db;

// utility function to let you set the page contents
function setPage(html) {
    document.getElementById("app").innerHTML = html;
}

// loads the DB
// if this fails you can't do anything so we set the page to show an error and bail
async function loadDB() {
    if (!('indexedDB' in window)) {
        setPage(`<div id="app-container">
<h1>mallard error</h1>
<p>your browser doesn't support indexeddb, so you can't use mallard. sorry</p>
</div>`);
        return false;
    }
    
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("mallard", 1);
        request.onerror = (e) => {
            console.error(request.error);
            setPage(`<div id="app-container">
<h1>mallard error</h1>
<p>something went wrong loading the db (so you can't use mallard right now); check the console for more info and bug minerobber</p>
</div>`);
            resolve(false);
        };
        
        request.onsuccess = (e) => {
            db = request.result;
            db.onerror = (e) => {
                console.error("DB error");
                console.error(e.target.error);
            }
            resolve(true);
        };
        
        request.onupgradeneeded = (e) => {
            const db = request.result;
            if (e.oldVersion<1) {
                const bangs = db.createObjectStore("bangs", {keyPath: "t"});
                const settings = db.createObjectStore("settings", {});
            }
        }
    });
}

async function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = (e) => {
            resolve(e.target.result ?? null);
        };
        request.onerror = (e) => {
            reject(e.target.error ?? null);
        };
    });
}

// loads bang from DB (obviously requires DB to be loaded)
// converts weird callback hell into "normal" async js
// a result of null means that the bang doesn't exist in the DB
async function getBangFromDB(trigger) {
    if (trigger===null) return null;
    return requestToPromise(db.transaction("bangs").objectStore("bangs").get(trigger));
}

// gets default bang from settings
async function getDefaultBang() {
    return requestToPromise(db.transaction("settings").objectStore("settings").get("default-bang"));
}

// sets default bang
async function setDefaultBang(trigger) {
    return requestToPromise(db.transaction("settings","readwrite").objectStore("settings").put(trigger,"default-bang"));
}

// get all bangs (used in export and settings menu)
async function getAllBangs() {
    return requestToPromise(db.transaction("bangs").objectStore("bangs").getAll());
}

// put a bang into the DB
async function putBang(bang) {
    return requestToPromise(db.transaction("bangs","readwrite").objectStore("bangs").put(bang));
}

// delete bang
async function deleteBang(trigger) {
    return requestToPromise(db.transaction("bangs","readwrite").objectStore("bangs").delete(trigger));
}

// convert base64url string into bang object
function base64ToBang(b64) {
    const binstring = atob(b64.replaceAll("-","+").replaceAll("_","/"));
    const data = Uint8Array.from(binstring, (c)=>c.codePointAt(0));
    const decoder = new TextDecoder();
    const str = decoder.decode(data);
    return JSON.parse(str) ?? null;
}

// convert bang object to base64url string
function bangToBase64(bang) {
    const str = JSON.stringify(bang);
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const binstring = Array.from(data,(c)=>String.fromCharCode(c)).join('');
    return btoa(binstring).replaceAll("+","-").replaceAll("/","_");
}