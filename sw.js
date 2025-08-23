this.addEventListener("install", (ev) => {
    ev.waitUntil(caches.open("v1").then((cache)=>{
        cache.addAll([
            "./",
            "./index.html",
            "./index.js",
            "./bangdb.js",
            "./style.css",
            "./dialog-customelements.js"
        ]);
    }));
});

this.addEventListener("fetch", async (ev)=>{
    if (ev.request.method!=="GET") return;
    
    let cache = await caches.open("v1");
    let match = await cache.match(ev.request);
    if (match) {
        ev.waitUntil(cache.add(ev.request));
        ev.respondWith(match);
        return;
    }
    if (request.url.endsWith("/bangs.json")) {
        ev.waitUntil(cache.add("./bangs.json"));
    }
    ev.respondWith(fetch(ev.request));
});
