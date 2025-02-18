const { app, BrowserWindow, ipcMain, nativeImage } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

// ✅ Define a writable database path
const dbPath = path.join(app.getPath("userData"), "fmk.db");

// ✅ If the database doesn’t exist, copy it from the packaged app
if (!fs.existsSync(dbPath)) {
  const sourceDbPath = path.join(__dirname, "fmk.db");
  if (fs.existsSync(sourceDbPath)) {
    fs.copyFileSync(sourceDbPath, dbPath);
  } else {
    console.error("❌ Database file not found in the packaged app.");
  }
}


// ✅ Open the database from a writable location
const db = new Database(dbPath);

// Ensure table is created
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_started TEXT,
    completed_date TEXT,
    project_name TEXT NOT NULL,
    fabric_chosen INTEGER DEFAULT 0,
    cut INTEGER DEFAULT 0,
    pieced INTEGER DEFAULT 0,
    assembled INTEGER DEFAULT 0,
    back_prepped INTEGER DEFAULT 0,
    basted INTEGER DEFAULT 0,
    quilted INTEGER DEFAULT 0,
    bound INTEGER DEFAULT 0,
    photographed INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    important INTEGER DEFAULT 0
  )
`);


function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1675,
    height: 800,
    icon: path.join(__dirname, "assets/icons/mac/MyIcon.icns"), // Set window icon
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile("index.html");
}


app.whenReady().then(() => {
  //const iconPath = path.join(process.resourcesPath, "MyIcon.png");
  const iconPath = path.join(process.resourcesPath, "MyIcon.icns");

  const dockIcon = nativeImage.createFromPath(iconPath);
  app.dock.setIcon(dockIcon);
  
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("saveRow", async (event, data) => {
  try {
    if (data.id) {
      const stmt = db.prepare(`
        UPDATE projects SET
          date_started = ?, completed_date = ?, project_name = ?,
          fabric_chosen = ?, cut = ?, pieced = ?, assembled = ?,
          back_prepped = ?, basted = ?, quilted = ?, bound = ?,
          photographed = ?, important = ?
        WHERE id = ?
      `);
      stmt.run(
          data.dateStarted, data.completedDate, data.projectName,
          data.fabricChosen, data.cut, data.pieced, data.assembled,
          data.backPrepped, data.basted, data.quilted, data.bound,
          data.photographed, data.important, data.id
      );
      return { success: true, id: data.id };
    } else {
      const stmt = db.prepare(`
        INSERT INTO projects
        (date_started, completed_date, project_name, fabric_chosen, cut, pieced, assembled,
         back_prepped, basted, quilted, bound, photographed, important)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
          data.dateStarted, data.completedDate, data.projectName,
          data.fabricChosen, data.cut, data.pieced, data.assembled,
          data.backPrepped, data.basted, data.quilted, data.bound,
          data.photographed, data.important
      );

      return { success: true, id: result.lastInsertRowid };
    }
  } catch (error) {
    console.error("Save Error:", error);
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
    const validColumns = [
      "date_started", "completed_date", "project_name", "fabric_chosen",
      "cut", "pieced", "assembled", "back_prepped", "basted",
      "quilted", "bound", "photographed"
    ];
    const validOrders = ["ASC", "DESC"];

    if (!validColumns.includes(sortBy) || !validOrders.includes(sortOrder)) {
      sortBy = "completed_date"; // Default fallback
      sortOrder = "DESC";
    }

    const query = `
      SELECT id, date_started, completed_date, project_name,
             fabric_chosen, cut, pieced, assembled, back_prepped,
             basted, quilted, bound, photographed
      FROM projects
      WHERE deleted = 1
      ORDER BY ${sortBy} ${sortOrder}
    `;

    return db.prepare(query).all();
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

ipcMain.handle("purgeDeletedRows", async () => {
  try {
    const stmt = db.prepare("DELETE FROM projects WHERE deleted = 1");
    stmt.run();
    return { success: true };
  } catch (error) {
    console.error("Purge All Error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("purgeDeletedRow", async (event, rowId) => {
  try {
    const stmt = db.prepare("DELETE FROM projects WHERE id = ?");
    stmt.run(rowId);

    return { success: true };
  } catch (error) {
    console.error("Purge Error:", error);
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
    const query = `
      SELECT id, date_started, completed_date, project_name, 
       fabric_chosen, cut, pieced, assembled, back_prepped, 
       basted, quilted, bound, photographed, important
      FROM projects 
      WHERE archived = 0 AND deleted = 0
    `;
    const rows = db.prepare(query).all();
    return rows;
  } catch (error) {
    console.error("Fetch Active Error:", error);
    return [];
  }
});


ipcMain.handle("getArchivedRows", async (event, sortBy = "completed_date", sortOrder = "DESC") => {
  try {
    const validColumns = [
      "date_started", "completed_date", "project_name", "fabric_chosen",
      "cut", "pieced", "assembled", "back_prepped", "basted",
      "quilted", "bound", "photographed"
    ];
    const validOrders = ["ASC", "DESC"];

    if (!validColumns.includes(sortBy) || !validOrders.includes(sortOrder)) {
      sortBy = "completed_date"; // Default fallback
      sortOrder = "DESC";
    }

    const query = `
      SELECT id, date_started, completed_date, project_name,
             fabric_chosen, cut, pieced, assembled, back_prepped,
             basted, quilted, bound, photographed
      FROM projects
      WHERE archived = 1
      ORDER BY ${sortBy} ${sortOrder}
    `;

    return db.prepare(query).all();
  } catch (error) {
    console.error("Fetch Archived Error:", error);
    return [];
  }
});

ipcMain.handle("markImportant", async (event, rowId, isImportant) => {
  try {
    const stmt = db.prepare("UPDATE projects SET important = ? WHERE id = ?");
    stmt.run(isImportant, rowId);
    return { success: true };
  } catch (error) {
    console.error("Important Row Error:", error);
    return { success: false, error: error.message };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});