const {ipcRenderer, contextBridge} = require('electron');

contextBridge.exposeInMainWorld('electronIPC', {
    sendToParent: (channel, ...args) => {
        ipcRenderer.sendToHost(channel, ...args);
    }
});

const script = document.createElement('script');
script.innerText = [
    'window.confirm = function() {',
    "console.log('\"window.confirm\" is disabled in webview.')",
    '};',
    'window.prompt = function() {',
    "console.log('\"window.prompt\" is disabled in webview.')",
    '};',
    'window.alert = function(msg) {',
    "window.open(`xxc://webview/alert/${encodeURIComponent(msg)}`, '_blank');",
    '};',
].join('\n');
document.appendChild(script);
document.removeChild(script);
