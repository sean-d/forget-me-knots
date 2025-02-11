// const { contextBridge, ipcRenderer } = require("electron");
//
// contextBridge.exposeInMainWorld("electronAPI", {
//     saveRow: (rowData) => ipcRenderer.invoke("save-row", rowData),
// });

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    saveRow: (rowData) => ipcRenderer.invoke("save-row", rowData),
});