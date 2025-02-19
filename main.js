const { Menu, app, BrowserWindow, ipcMain, nativeImage } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

let mainWindow;

// ✅ Define Dock Menu for macOS
if (process.platform === "darwin") {
  const dockMenu = Menu.buildFromTemplate([
    {
      label: "ALL THE REPORTS",
      click: () => {
        createReportsWindow();
      },
    },
    { label: "Quit", role: "quit" },
  ]);

  app.whenReady().then(() => {
    app.dock.setMenu(dockMenu);
  });
}

// ✅ Define database path
const dbPath = path.join(app.getPath("userData"), "fmk.db");

// ✅ If the database doesn’t exist, copy it
if (!fs.existsSync(dbPath)) {
  const sourceDbPath = path.join(__dirname, "fmk.db");
  if (fs.existsSync(sourceDbPath)) {
    fs.copyFileSync(sourceDbPath, dbPath);
  }
}

// ✅ Open database
const db = new Database(dbPath);

// ✅ Ensure tables exist
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

// ✅ REGISTER ALL IPC HANDLERS BEFORE `app.whenReady()`
ipcMain.handle("getActiveRows", async () => {
  try {
    return db.prepare(`
      SELECT id, date_started, completed_date, project_name, 
             fabric_chosen, cut, pieced, assembled, back_prepped, 
             basted, quilted, bound, photographed, important
      FROM projects 
      WHERE archived = 0 AND deleted = 0
    `).all();
  } catch {
    return [];
  }
});

ipcMain.handle("saveRow", async (event, data) => {
  try {
    if (!data.dateStarted || typeof data.dateStarted !== "string" || data.dateStarted.trim() === "") {
      throw new Error("Start date is required.");
    }

    if (!data.projectName || typeof data.projectName !== "string") {
      throw new Error("Project name is required.");
    }

    const dateStarted = data.dateStarted.trim();
    const completedDate = data.completedDate?.trim() || null;

    if (data.id) {
      db.prepare(`
        UPDATE projects SET
          date_started = ?, completed_date = ?, project_name = ?,
          fabric_chosen = ?, cut = ?, pieced = ?, assembled = ?,
          back_prepped = ?, basted = ?, quilted = ?, bound = ?,
          photographed = ?, important = ?
        WHERE id = ?
      `).run(
          dateStarted, completedDate, data.projectName,
          data.fabricChosen, data.cut, data.pieced, data.assembled,
          data.backPrepped, data.basted, data.quilted, data.bound,
          data.photographed, data.important, data.id
      );
      return { success: true, id: data.id };
    } else {
      const result = db.prepare(`
        INSERT INTO projects
        (date_started, completed_date, project_name, fabric_chosen, cut, pieced, assembled,
         back_prepped, basted, quilted, bound, photographed, important)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
          dateStarted, completedDate, data.projectName,
          data.fabricChosen, data.cut, data.pieced, data.assembled,
          data.backPrepped, data.basted, data.quilted, data.bound,
          data.photographed, data.important
      );

      return { success: true, id: result.lastInsertRowid };
    }
  } catch (error) {
    return { success: false, error: error.message };
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

    return db.prepare(`
      SELECT id, date_started, completed_date, project_name,
             fabric_chosen, cut, pieced, assembled, back_prepped,
             basted, quilted, bound, photographed
      FROM projects
      WHERE archived = 1
      ORDER BY ${sortBy} ${sortOrder}
    `).all();
  } catch (error) {
    return [];
  }
});


ipcMain.handle("archiveRow", async (event, rowId, isArchived) => {
  try {
    db.prepare("UPDATE projects SET archived = ? WHERE id = ?").run(isArchived ? 1 : 0, rowId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("deleteRow", async (event, rowId) => {
  try {
    db.prepare("UPDATE projects SET deleted = 1 WHERE id = ?").run(rowId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

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

    return db.prepare(`
      SELECT id, date_started, completed_date, project_name,
             fabric_chosen, cut, pieced, assembled, back_prepped,
             basted, quilted, bound, photographed
      FROM projects
      WHERE deleted = 1
      ORDER BY ${sortBy} ${sortOrder}
    `).all();
  } catch (error) {
    return [];
  }
});

ipcMain.handle("restoreDeletedRow", async (event, rowId) => {
  try {
    // Restore item by setting deleted = 0 and keeping archived status unchanged
    db.prepare("UPDATE projects SET deleted = 0 WHERE id = ?").run(rowId);

    // Fetch the item's archived status
    const row = db.prepare("SELECT archived FROM projects WHERE id = ?").get(rowId);

    return { success: true, archived: row?.archived || 0 }; // Return archived status
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("purgeDeletedRow", async (event, rowId) => {
  try {
    db.prepare("DELETE FROM projects WHERE id = ?").run(rowId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


// ✅ Get total number of open projects
ipcMain.handle("getTotalOpenProjects", async () => {
  try {
    const result = db.prepare("SELECT COUNT(*) AS total FROM projects WHERE archived = 0 AND deleted = 0").get();
    return { success: true, total: result?.total || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ Get total number of completed projects
ipcMain.handle("getTotalCompletedProjects", async () => {
  try {
    const result = db.prepare("SELECT COUNT(*) AS total FROM projects WHERE archived = 1 AND deleted = 0").get();
    return { success: true, total: result?.total || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ Get open & completed projects within a date range
ipcMain.handle("getProjectsByDateRange", async (event, startDate, endDate) => {
  try {
    const openProjects = db.prepare(`
      SELECT COUNT(*) AS total FROM projects 
      WHERE archived = 0 AND deleted = 0 
      AND date_started BETWEEN ? AND ?
    `).get(startDate, endDate) || { total: 0 };

    const completedProjects = db.prepare(`
      SELECT COUNT(*) AS total FROM projects 
      WHERE archived = 1 AND deleted = 0
      AND completed_date BETWEEN ? AND ?
    `).get(startDate, endDate) || { total: 0 };

    return {
      success: true,
      openProjects: openProjects.total,
      completedProjects: completedProjects.total,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ Function to Create Reports Window
function createReportsWindow() {
  const reportsWindow = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  reportsWindow.loadFile("reports.html");
}

// ✅ IPC Handler for Opening Reports
ipcMain.handle("openReports", () => {
  createReportsWindow();
});

// ✅ Start Electron app
app.whenReady().then(() => {
  createWindow();

  if (process.platform === "darwin") {
    const iconPath = path.join(process.resourcesPath, "MyIcon.icns");
    const dockIcon = nativeImage.createFromPath(iconPath);
    app.dock.setIcon(dockIcon);
  }
});

function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1675,
    height: 800,
    icon: path.join(process.resourcesPath, "MyIcon.icns"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });
}

// ✅ Handle macOS behavior
app.on("activate", () => {
  if (!mainWindow) createWindow();
});

// ✅ Quit app when all windows are closed (except macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});