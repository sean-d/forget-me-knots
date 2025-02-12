const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");

// Initialize database
const db = new Database("fmk.db");

// Ensure table is created
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  completed_date TEXT,
  project_name TEXT,
  fabric_chosen INTEGER,
  cut INTEGER,
  pieced INTEGER,
  assembled INTEGER,
  back_prepped INTEGER,
  basted INTEGER,
  quilted INTEGER,
  bound INTEGER,
  photographed INTEGER,
  archived INTEGER DEFAULT 0
)
`);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Using preload for security
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(createWindow);


ipcMain.handle("saveRow", async (event, rowData) => {
  try {
    const values = [
      rowData.completedDate || null,
      rowData.projectName || null,
      Number(rowData.fabricChosen) || 0,
      Number(rowData.cut) || 0,
      Number(rowData.pieced) || 0,
      Number(rowData.assembled) || 0,
      Number(rowData.backPrepped) || 0,
      Number(rowData.basted) || 0,
      Number(rowData.quilted) || 0,
      Number(rowData.bound) || 0,
      Number(rowData.photographed) || 0,
      0, // Default archived = 0 (not archived)
    ];

    if (rowData.id) {
      const stmt = db.prepare(`
        UPDATE projects 
        SET completed_date = ?, project_name = ?, fabric_chosen = ?, cut = ?, pieced = ?, assembled = ?, 
            back_prepped = ?, basted = ?, quilted = ?, bound = ?, photographed = ?, archived = ?
        WHERE id = ?
      `);
      stmt.run(...values, rowData.id);
      return { success: true, id: rowData.id };
    } else {
      const stmt = db.prepare(`
        INSERT INTO projects (completed_date, project_name, fabric_chosen, cut, pieced, assembled, 
                              back_prepped, basted, quilted, bound, photographed, archived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(...values);
      return { success: true, id: info.lastInsertRowid };
    }
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, error: error.message };
  }
});

// handle delete request from renderer
ipcMain.handle("deleteRow", async (event, rowId) => {
  try {
    const stmt = db.prepare("DELETE FROM projects WHERE id = ?");
    stmt.run(rowId);
    return { success: true };
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("archiveRow", async (event, rowId, isArchived) => {
  try {
    const stmt = db.prepare("UPDATE projects SET archived = ? WHERE id = ?");
    stmt.run(isArchived ? 1 : 0, rowId);
    return { success: true };
  } catch (error) {
    console.error("Archive Error:", error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle("getArchivedRows", async () => {
  try {
    const rows = db.prepare("SELECT * FROM projects WHERE archived = 1").all();
    return rows;
  } catch (error) {
    console.error("Fetch Archived Error:", error);
    return [];
  }
});

ipcMain.handle("getActiveRows", async () => {
  try {
    const rows = db.prepare("SELECT * FROM projects WHERE archived = 0").all();
    return rows;
  } catch (error) {
    console.error("Fetch Active Error:", error);
    return [];
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});