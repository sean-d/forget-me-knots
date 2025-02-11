// const { app, BrowserWindow, ipcMain } = require("electron");
// const path = require("path");
// const Database = require("better-sqlite3");
//
// // Initialize SQLite database
// const db = new Database("fmk.sqlite");
//
// // Create the table if it doesn't exist
// db.prepare(
//     `CREATE TABLE IF NOT EXISTS projects (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     completed_date TEXT,
//     project_name TEXT,
//     fabric_chosen INTEGER,
//     cut INTEGER,
//     pieced INTEGER,
//     assembled INTEGER,
//     back_prepped INTEGER,
//     basted INTEGER,
//     quilted INTEGER,
//     bound INTEGER,
//     photographed INTEGER
//   )`
// ).run();
//
// function createWindow() {
//   const mainWindow = new BrowserWindow({
//     width: 1400, // Set width to 1400px
//     height: 800,
//     webPreferences: {
//       preload: path.join(__dirname, "preload.js"),
//       contextIsolation: false,
//       enableRemoteModule: true,
//       nodeIntegration: true,
//     },
//   });
//
//   mainWindow.loadFile("index.html");
// }
//
// app.whenReady().then(() => {
//   createWindow();
//
//   app.on("activate", () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });
//
// // Handle saving a row
// ipcMain.handle("save-row", (event, rowData) => {
//   const stmt = db.prepare(
//       `INSERT INTO projects (completed_date, project_name, fabric_chosen, cut, pieced, assembled, back_prepped, basted, quilted, bound, photographed)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
//   );
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
//
// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });

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

// Handle saving a row to SQLite
ipcMain.handle("save-row", (event, rowData) => {
  const stmt = db.prepare(`
    INSERT INTO projects (completed_date, project_name, fabric_chosen, cut, pieced, assembled, back_prepped, basted, quilted, bound, photographed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
      rowData.completed_date,
      rowData.project_name,
      rowData.fabric_chosen,
      rowData.cut,
      rowData.pieced,
      rowData.assembled,
      rowData.back_prepped,
      rowData.basted,
      rowData.quilted,
      rowData.bound,
      rowData.photographed
  );

  return { success: true };
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});