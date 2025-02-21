/**
 * Preload script to securely expose Electron IPC methods to the renderer process.
 *
 * - Uses `contextBridge` to limit direct access to `ipcRenderer`, enhancing security.
 * - Provides safe, structured API calls for communication with the main process.
 * - Prevents direct `require("electron")` calls in the renderer process.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    saveRow: (data) => ipcRenderer.invoke("saveRow", data),
    deleteRow: (id) => ipcRenderer.invoke("deleteRow", id),
    archiveRow: (id, isArchived) => ipcRenderer.invoke("archiveRow", id, isArchived),
    getArchivedRows: (sortBy, sortOrder) => ipcRenderer.invoke("getArchivedRows", sortBy, sortOrder),
    getActiveRows: () => ipcRenderer.invoke("getActiveRows"),
    getDeletedRows: (sortBy, sortOrder) => ipcRenderer.invoke("getDeletedRows", sortBy, sortOrder),
    restoreDeletedRow: (id) => ipcRenderer.invoke("restoreDeletedRow", id),
    purgeDeletedRow: (id) => ipcRenderer.invoke("purgeDeletedRow", id),
    purgeDeletedRows: () => ipcRenderer.invoke("purgeDeletedRows"),
    openReports: () => ipcRenderer.invoke("openReports"),
    getTotalOpenProjects: () => ipcRenderer.invoke("getTotalOpenProjects"),
    getTotalCompletedProjects: () => ipcRenderer.invoke("getTotalCompletedProjects"),
    getProjectsByDateRange: (startDate, endDate) => ipcRenderer.invoke("getProjectsByDateRange", startDate, endDate),
    exportData: () => ipcRenderer.invoke("exportData"),
    importData: () => ipcRenderer.invoke("importData"),
});