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
        }
    });
}

// loads bang from DB (obviously requires DB to be loaded)
// converts weird callback hell into "normal" async js
// a result of null means that the bang doesn't exist in the DB
async function getBangFromDB(trigger) {
    if (trigger===null) return null;
    return requestToPromise(db.transaction("bangs").objectStore("bangs").get(trigger))
}

// gets default bang from settings
async function getDefaultBang() {
    return requestToPromise(db.transaction("settings").objectStore("settings").get("default-bang"));
}

// refreshes the bangs list in the settings menu
function refreshBangsList() {
    let bangedit = document.getElementById("new-or-edit-bang");
    let bangslist = document.getElementById("bangs-list");
    let defaultbang = document.getElementById("defaultbang");
    bangslist.innerHTML = `<li><a is="modal-open" modal="new-or-edit-bang">New bang</a></li>`;
    defaultbang.innerHTML = "";
    defaultbang.disabled = true;
    let hasBangs = false;
    let bangs = db.transaction("bangs").objectStore("bangs");
    bangs.getAll().onsuccess = async (ev) => {
        const bangs = ev.target.result;
        bangs.forEach((bang) => {
            // bangslist
            let li = document.createElement("li");
            li.innerHTML = `${bang.s} (!${bang.t}; <a is="modal-open" modal="new-or-edit-bang">edit</a> or <a href='#'>delete</a>)`
            li.children[0].addEventListener("click",() => {
                bangedit.loadBang(bang);
            });
            li.children[1].addEventListener("click",() => {
                if (confirm(`Are you sure you wish to delete ${bang.s} (!${bang.t})?`)) {
                    let request = db.transaction("bangs","readwrite").objectStore("bangs").delete(bang.t);
                    request.onerror = (ev) => {
                        alert(`Error deleting bang: ${request.error.message}`);
                        refreshBangsList();
                    }
                    request.onsuccess = (ev) => {
                        //alert("Bang deleted successfully!");
                        refreshBangsList();
                    }
                }
            });
            bangslist.appendChild(li);
            // defaultbang
            option = document.createElement("option");
            option.setAttribute("value",bang.t);
            option.innerText = `${bang.s} (!${bang.t})`
            defaultbang.appendChild(option);
            hasBangs = true;
        });
        if (hasBangs) {
            let realDefaultBang = await getDefaultBang();
            defaultbang.selectedIndex = -1;
            for (const i in defaultbang.options) {
                if (defaultbang.options[i].value==realDefaultBang) {
                    defaultbang.selectedIndex = i;
                }
            }
            defaultbang.disabled = false;
        }
    };
}

// basic default homepage render
// includes modal dialogs
function renderIndex() {
    setPage(`<div id="app-container">
<h1>mallard</h1>
<p>mallard is like unduck/unduckify but <del>overcomplicated</del> <del>overengineered</del> flexible? sure let's go with that.</p>
<p>you can set up your <a is="modal-open" modal="settings">settings</a> here.</p>
<p class="flexcol"><input type="text" alt="Link" value="https://minerobber9000.github.io/mallard/?q=%s" readonly><button data-what="copy">Copy</button></p>
<p>or type a query here:</p>
<p><form method="get" class="flexcol"><input type="text" alt="Search" name="q"><button type="submit">Search</button></form></p>
</div>
<dialog id="settings">
<p style="text-align: right;"><button is="dialog-close">Close</button></p>
<h1>Bangs</h1>
<div class="box">
<ul id="bangs-list"></ul>
</div>
<p><label>Default bang: <select id="defaultbang" disabled></select></label></p>
<p><a href="#" id="export-settings">Export settings</a> / <a is="modal-open" modal="import-settings">Import settings</a>
</dialog>
<dialog id="import-settings">
<p style="text-align: right;"><button is="dialog-close">Close</button></p>
<h1>settings import</h1>
<p><form><label>file: <input type="file" accept=".json,application/json,text/json"></label></form></p>
</dialog>
<dialog id="new-or-edit-bang" is="bang-edit">
<p style="text-align: right;"><button is="dialog-close">Close</button></p>
<form method="dialog">
<p><label>Bang name: <input type="text" name="s" required></label></p>
<p><label>Domain: <input type="text" name="d" required></label></p>
<p><label>Alternative domain (leave blank if not required): <input type="text" name="ad"></label></p>
<p><label>Trigger (!&lt;this&gt; to use this bang): <input type="text" name="t" required></label></p>
<p><label>URL Template (use <code>{{{s}}}</code> as placeholder):<br><input type="text" name="u" required></label></p>
<p>Format flags (leave these alone if you don't understand them):<ul>
<li><label>Open the base path (domain or alternate domain) when no query is given: <input type="checkbox" name="open_base_path" checked></label></li>
<li><label>URL encode queries: <input type="checkbox" name="url_encode_placeholder" checked></label></li>
<li><label>When URL encoding queries, encode space as '+': <input type="checkbox" name="url_encode_space_to_plus" checked></label></li>
</ul><p>
<p><button type="submit">Submit</button> <a is="modal-open" modal="kagi-wizard">(import kagi/ddg bang)</a></p>
</form>
</dialog>
<dialog id="kagi-wizard">
<p style="text-align: right;"><button is="dialog-close">Close</button></p>
<h1>kagi bang importer</h1>
<p>enter a bang trigger from <a href="https://github.com/kagisearch/bangs" target="_blank">kagi's bangs</a> (use a duckduckgo one, if you don't know kagi's bang set)</p>
<form method="dialog">
<p><label>Trigger (!&lt;this&gt; to use this bang): <input type="text" name="t" required></label></p>
<p><button type="submit">Submit</button></p>
</form>
</dialog>
<dialog id="new-user-wizard">
<p style="text-align: right;"><button is="dialog-close">Close</button></p>
<h1>Welcome to mallard!</h1>
<p>mallard is like unduck/unduckify but <del>overcomplicated</del> <del>overengineered</del> flexible? sure let's go with that.</p>
<p>before we continue, you'll need to decide on a default bang. this is where your search will go if you don't supply a bang to send it somewhere else.</p>
<form method="dialog">
<p><label>Default bang: <select name="defaultbang">
<option value="g" selected>Google (!g)</option>
<option value="ddg">DuckDuckGo (!ddg)</option>
<option value=" custom">Custom bang (!&lt;...&gt;)</option>
</select></label></p>
<p><button type="submit">Submit</button> <a is="modal-open" modal="import-settings">(or import settings from another computer)</a></p>
</form>
</dialog>`);
    let copybtn = document.querySelector("button[data-what='copy']");
    copybtn.addEventListener("click",(ev)=>{
        let copyText = copybtn.parentElement.querySelector("input");
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(copyText.value);
        alert("Copied!");
    });
    let exportsettings = document.getElementById("export-settings");
    exportsettings.addEventListener("click",async ()=>{
        let settings_export = {}
        settings_export.default_bang = await getDefaultBang();
        settings_export.bangs = await requestToPromise(db.transaction("bangs").objectStore("bangs").getAll());
        
        let blob = new Blob([JSON.stringify(settings_export)],{type:"application/json"});
        let blobUrl = URL.createObjectURL(blob);
        
        let a = document.createElement("a");
        a.href = blobUrl;
        a.download = "settings_export.json";
        
        a.click();
        URL.revokeObjectURL(blobUrl);
    });
    let importsettings = document.getElementById("import-settings");
    importsettings.querySelector("input[type='file']").addEventListener("change",async (ev)=>{
        let files = ev.target.files;
        if (files.length===0) return;
        let settings_export = await new Promise((resolve, reject)=>{
            const reader = new FileReader();
            reader.addEventListener("load",(ev)=>{
                resolve(ev.target.result);
            })
            reader.readAsText(files[0]);
        });
        try {
            settings_export = JSON.parse(settings_export);
            if (settings_export.default_bang) {
                if ((typeof settings_export.default_bang)==="string") {
                    db.transaction("settings","readwrite").objectStore("settings").put(settings_export.default_bang, "default-bang");
                } else {
                    throw new CustomError("default_bang must be string!");
                }
            }
            if (settings_export.bangs) {
                if (settings_export.bangs instanceof Array) {
                    let obj_store = db.transaction("bangs", "readwrite").objectStore("bangs");
                    settings_export.bangs.forEach((bang)=>obj_store.put(bang));
                } else {
                    throw new CustomError("bangs must be array!");
                }
            }
            ev.target.parentElement.parentElement.reset();
            importsettings.close();
            bangedit.loadBang(await getBangFromDB(await getDefaultBang()));
            bangedit.showModal();
        } catch (e) {
            alert(`Error importing settings: ${e.message}`);
            console.error(e);
        }
    });
    let bangedit = document.getElementById("new-or-edit-bang");
    bangedit.addEventListener("formsubmit",(e)=>{
        const values = e.detail.form.elements;
        if (values.t.value==="settings") {
            alert("mallard reserves !settings for the settings quick-launch.");
            return e.detail.cancel();
        }
        let bang = {
            s: values.s.value,
            d: values.d.value,
            t: values.t.value,
            u: values.u.value
        };
        if (values.ad.value!=='') {
            bang.ad = values.ad.value;
        }
        if (!(values.open_base_path.checked && values.url_encode_placeholder.checked && values.url_encode_space_to_plus.checked)) {
            let fmt = [];
            if (values.open_base_path.checked) fmt.push("open_base_path");
            if (values.url_encode_placeholder.checked) fmt.push("url_encode_placeholder");
            if (values.url_encode_space_to_plus.checked) fmt.push("url_encode_space_to_plus");
            bang.fmt = fmt;
        }
        let request = db.transaction("bangs", "readwrite").objectStore("bangs").put(bang);
        request.onerror = (ev) => {
            alert(`Error adding bang: ${request.error.message}`);
            bangedit.loadBang(bang);
            bangedit.open();
        };
        request.onsuccess = (ev) => {
            //alert("Bang added successfully!");
            refreshBangsList();
        }
        setTimeout(()=>bangedit.resetForm(),100);
    });
    let defaultbang = document.getElementById("defaultbang");
    defaultbang.addEventListener("change",(ev)=>{
        if (ev.target.disabled) return;
        db.transaction("settings","readwrite").objectStore("settings").put(ev.target.options[ev.target.selectedIndex].value,"default-bang");
    });
    refreshBangsList();
    let kagiwizard = document.getElementById("kagi-wizard");
    kagiwizard.querySelector("form").addEventListener("submit",(ev)=>{
        let trigger = ev.target.elements.t.value;
        ev.target.reset();
        fetch("./bangs.json").then((resp)=>{
            if (!resp.ok) {
                console.log("error loading bangs.json");
                console.log(resp);
                return new Promise((resolve, reject)=>resolve(null));
            }
            return resp.json();
        }).then((data)=>{
            let bangdata = {t: trigger};
            if (data!=null) {
                data.forEach((bang)=>{
                    if (bang.t===trigger) {
                        delete bang.c;
                        delete bang.sc;
                        bangdata = bang;
                    }
                });
            }
            bangedit.loadBang(bangdata);
        });        
    });
    let newuserwizard = document.getElementById("new-user-wizard");
    newuserwizard.querySelector("form").addEventListener("submit",(ev) => {
        let defaultbang = ev.target.elements.defaultbang;
        let trigger = defaultbang.options[defaultbang.selectedIndex].value;
        if (trigger===" custom") {
            let setDefault = (ev) => {
                let form = ev.target.form;
                db.transaction("settings","readwrite").objectStore("settings").put(form.elements.t.value,"default-bang");
            }
            bangedit.addEventListener("formsubmit", setDefault, {once: true});
            bangedit.addEventListener("close", ()=>bangedit.removeEventListener("formsubmit", setDefault), {once: true});
            bangedit.showModal();
            return;
        }
        db.transaction("settings","readwrite").objectStore("settings").put(trigger,"default-bang");
        fetch("./bangs.json").then((resp)=>{
            if (!resp.ok) {
                console.log("error loading bangs.json");
                console.log(resp);
                return new Promise((resolve, reject)=>resolve(null));
            }
            return resp.json();
        }).then((data)=>{
            let bangdata = {t: trigger};
            if (data!=null) {
                data.forEach((bang)=>{
                    if (bang.t===trigger) {
                        delete bang.c;
                        delete bang.sc;
                        bangdata = bang;
                    }
                });
            }
            bangedit.loadBang(bangdata);
            bangedit.showModal();
        });        
    });
    newuserwizard.querySelector("a[modal='import-settings']").addEventListener("click",()=>{
        newuserwizard.close();
    });
}

// checks fmt flags (see: https://github.com/kagisearch/bangs/tree/main?tab=readme-ov-file#format-flags)
function fmtFlag(bang, flag) {
    if (!bang.hasOwnProperty("fmt")) return true; // if fmt is not provided, assume all flags
    return bang.fmt.includes(flag);
}

// gets a redirect URL for a given query
async function getRedirectUrl(query) {
    if (query==="" || query==="!" || query==="!settings") {
        renderIndex();
        // if !settings is the query, open the settings modal automagically
        if (query==="!settings") document.getElementById("settings").showModal();
        // if we don't have a default bang then open the new user wizard
        if ((await getDefaultBang())==null) {
            document.getElementById("settings").close();
            document.getElementById("new-user-wizard").showModal();
        }
        return null;
    }

    const match = query.toLowerCase().match(/^!(\S+)/i);
    const trigger = match ? match[1] : (await getDefaultBang());
    const cleanQuery = match ? query.replace(/^!\S+\s*/i,"").trim() : query;
    
    // get bang object
    const bang = await getBangFromDB(trigger);
    
    // if we don't have one, then bail
    if (bang===null) {
        renderIndex();
        let bangedit = document.getElementById("new-or-edit-bang");
        let tryagain = async () => {
            document.getElementById("settings").close();
            await new Promise((resolve, reject)=>setTimeout(resolve,100));
            setPage("");
            let url = await getRedirectUrl(query);
            if (url!==null) {
                window.location.href = url;
            }
        };
        bangedit.addEventListener("formsubmit",tryagain,{once: true});
        bangedit.addEventListener("close",()=>bangedit.removeEventListener("formsubmit",tryagain),{once:true});
        if (trigger === null) {
            document.getElementById("new-user-wizard").showModal();
        } else {
            document.getElementById("settings").showModal();
            fetch("./bangs.json").then((resp)=>{
                if (!resp.ok) {
                    console.log("error loading bangs.json");
                    console.log(resp);
                    return new Promise((resolve, reject)=>resolve(null));
                }
                return resp.json();
            }).then((data)=>{
                let bangdata = {t: trigger};
                if (data!=null) {
                    data.forEach((bang)=>{
                        if (bang.t===trigger) {
                            delete bang.c;
                            delete bang.sc;
                            bangdata = bang;
                        }
                    });
                }
                bangedit.loadBang(bangdata);
                bangedit.showModal();
            });
        }
        return null;
    }

    // if we have no query and this is a bang we should open the base path on, do so
    // use ad if it's there, since that means our search is on a different domain than the actual site
    if (cleanQuery==="" && fmtFlag(bang, "open_base_path")) {
        return `https://${bang.ad ?? bang.d}/`;
    }

    // encode the query according to fmt flags
    // this is the *correct* way to do this as opposed to whatever unduck/unduckify do with encode-but-not-slashes
    let encodedQuery = cleanQuery;
    if (fmtFlag(bang, "url_encode_placeholder")) {
        encodedQuery = encodeURIComponent(encodedQuery);
        if (fmtFlag(bang, "url_encode_space_to_plus")) encodedQuery = encodedQuery.replaceAll("%20","+");
    }

    // finally, replace placeholder with encoded query
    return bang.u.replace("{{{s}}}", encodedQuery);
}

// main function!
// 1. load the DB
// 2. get the query
// 3. get its redirect URL
// 4. if we have a URL, go there
async function doRedirect() {
    const dbSuccess = await loadDB();
    if (!dbSuccess) return;

    const url = new URL(window.location.href);
    const query = url.searchParams.get("q")?.trim() ?? "";
    
    let redirectUrl = await getRedirectUrl(query);
    if (redirectUrl!==null) {
        window.location.href = redirectUrl;
    }
}

doRedirect();