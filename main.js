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
  archived INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0
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

// // handle delete request from renderer

ipcMain.handle("deleteRow", async (event, rowId) => {
  try {
    const stmt = db.prepare("UPDATE projects SET deleted = 1 WHERE id = ?");
    stmt.run(rowId);
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: error.message };
  }
});

// Fetch all deleted items


ipcMain.handle("getDeletedRows", async (event, sortBy = "completed_date", sortOrder = "DESC") => {
  try {
    const validColumns = ["completed_date", "project_name"];
    const validOrders = ["ASC", "DESC"];

    if (!validColumns.includes(sortBy) || !validOrders.includes(sortOrder)) {
      throw new Error("Invalid sorting parameters");
    }

    const query = `SELECT * FROM projects WHERE deleted = 1 ORDER BY ${sortBy} ${sortOrder}`;
    const rows = db.prepare(query).all();

    return rows;
  } catch (error) {
    console.error("Fetch Deleted Error:", error);
    return [];
  }
});

// Restore an item from deleted
ipcMain.handle("restoreDeletedRow", async (event, rowId) => {
  try {
    // Restore item by setting deleted = 0 and keeping archived status unchanged
    const stmt = db.prepare("UPDATE projects SET deleted = 0 WHERE id = ?");
    stmt.run(rowId);

    // Fetch the item's archived status
    const row = db.prepare("SELECT archived FROM projects WHERE id = ?").get(rowId);

    return { success: true, archived: row.archived }; // Return archived status
  } catch (error) {
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


ipcMain.handle("getActiveRows", async () => {
  try {
    const rows = db.prepare("SELECT * FROM projects WHERE archived = 0 AND deleted = 0").all();
    return rows;
  } catch (error) {
    console.error("Fetch Active Error:", error);
    return [];
  }
});


ipcMain.handle("getArchivedRows", async (event, sortBy = "completed_date", sortOrder = "DESC") => {
  try {
    const validColumns = ["completed_date", "project_name"];
    const validOrders = ["ASC", "DESC"];

    // Prevent SQL Injection: Ensure valid column and order
    if (!validColumns.includes(sortBy) || !validOrders.includes(sortOrder)) {
      throw new Error("Invalid sorting parameters");
    }

    const query = `SELECT * FROM projects WHERE archived = 1 ORDER BY ${sortBy} ${sortOrder}`;
    const rows = db.prepare(query).all();

    return rows;
  } catch (error) {
    console.error("Fetch Archived Error:", error);
    return [];
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});