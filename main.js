const { app, BrowserWindow, ipcMain, nativeImage } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

let mainWindow;

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
    if (!data.projectName || typeof data.projectName !== "string") {
      throw new Error("Invalid project name.");
    }

    const dateStarted = data.dateStarted?.trim() || null;
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