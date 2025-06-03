if ("serviceWorker" in navigator) {
    const me = new URL(document.currentScript.src, window.location.href);
    const sw = new URL("./sw.js", me);
    navigator.serviceWorker.register(sw.pathname);
}