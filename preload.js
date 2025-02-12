const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    saveRow: (data) => ipcRenderer.invoke("saveRow", data),
    deleteRow: (id) => ipcRenderer.invoke("deleteRow", id),
    archiveRow: (id, isArchived) => ipcRenderer.invoke("archiveRow", id, isArchived),
    getArchivedRows: (sortBy, sortOrder) => ipcRenderer.invoke("getArchivedRows", sortBy, sortOrder),
    getActiveRows: () => ipcRenderer.invoke("getActiveRows"),
    getDeletedRows: (sortBy, sortOrder) => ipcRenderer.invoke("getDeletedRows", sortBy, sortOrder), // ✅ Ensure this is here
    restoreDeletedRow: (id) => ipcRenderer.invoke("restoreDeletedRow", id),
});