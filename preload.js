const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    saveRow: (data) => ipcRenderer.invoke("saveRow", data),
    deleteRow: (id) => ipcRenderer.invoke("deleteRow", id),
    archiveRow: (id, isArchived) => ipcRenderer.invoke("archiveRow", id, isArchived),
    getArchivedRows: () => ipcRenderer.invoke("getArchivedRows"),
    getActiveRows: () => ipcRenderer.invoke("getActiveRows"), // NEW FUNCTION
});

