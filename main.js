const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");

// Initialize database
const db = new Database("fmk.db");

// Ensure table is created
/*
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
    photographed INTEGER
  )
 */
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
  photographed INTEGER
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

// // Handle saving a row to SQLite
// ipcMain.handle("save-row", (event, rowData) => {
//   const stmt = db.prepare(`
//     INSERT INTO projects (completed_date, project_name, fabric_chosen, cut, pieced, assembled, back_prepped, basted, quilted, bound, photographed)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `);
//
//   stmt.run(
//       rowData.completed_date,
//       rowData.project_name,
//       rowData.fabric_chosen,
//       rowData.cut,
//       rowData.pieced,
//       rowData.assembled,
//       rowData.back_prepped,
//       rowData.basted,
//       rowData.quilted,
//       rowData.bound,
//       rowData.photographed
//   );
//
//   return { success: true };
// });

// Handle Save Request from Renderer
ipcMain.handle("saveRow", async (event, rowData) => {
  try {
    // Ensure all values are valid (numbers, strings, or null)
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
    ];

    if (rowData.id) {
      // Update existing record
      const stmt = db.prepare(`
        UPDATE projects 
        SET completed_date = ?, project_name = ?, fabric_chosen = ?, cut = ?, pieced = ?, assembled = ?, 
            back_prepped = ?, basted = ?, quilted = ?, bound = ?, photographed = ?
        WHERE id = ?
      `);

      stmt.run(...values, rowData.id);
      return { success: true, id: rowData.id };
    } else {
      // Insert new record
      const stmt = db.prepare(`
        INSERT INTO projects (completed_date, project_name, fabric_chosen, cut, pieced, assembled, 
                              back_prepped, basted, quilted, bound, photographed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(...values);
      return { success: true, id: info.lastInsertRowid };
    }
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, error: error.message };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});