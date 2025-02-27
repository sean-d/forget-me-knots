/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indicates if the operation was successful.
 * @property {string} [error] - Error message if the operation fails (optional).
 */

/**
 * @typedef {Object} SaveRowResponse
 * @property {boolean} success - Whether the operation was successful.
 * @property {number} [id] - The new row ID (only present if inserted).
 * @property {string} [error] - Error message if the operation fails.
 */

/**
 * @typedef {Object} RestoreResponse
 * @property {boolean} success - Whether the operation was successful.
 * @property {number} [archived] - 1 if the project was archived, 0 otherwise.
 * @property {string} [error] - Error message if the operation fails.
 */

/**
 * @typedef {Object} CountResponse
 * @property {boolean} success - Whether the operation was successful.
 * @property {number} [total] - The total number of projects.
 * @property {string} [error] - Error message if the operation fails.
 */

/**
 * @typedef {Object} DateRangeResponse
 * @property {boolean} success - Whether the operation was successful.
 * @property {number} [openProjects] - Number of open projects in the range.
 * @property {number} [completedProjects] - Number of completed projects in the range.
 * @property {string} [error] - Error message if the operation fails.
 */

/**
 * @typedef {Object} FileOperationResponse
 * @property {boolean} success - Whether the operation was successful.
 * @property {string} [message] - A user-friendly message.
 * @property {string} [filePath] - The path of the exported file (if applicable).
 * @property {string} [error] - Error message if the operation fails.
 */

/**
 * Imports required Electron and Node.js modules and initializes the database.
 *
 * - `dialog`, `Menu`, `app`, `BrowserWindow`, `ipcMain`, `nativeImage`: Electron modules for UI and IPC handling.
 * - `path`: Handles file system paths.
 * - `better-sqlite3`: Provides efficient SQLite database access.
 * - `fs`: Manages file system operations (checking/copying the database).
 *
 * Database Setup:
 * - `dbPath`: Defines the database file location in the user data directory.
 * - `db`: Initializes an SQLite database instance.
 * - Copies a default database from the app directory if one doesn't exist.
 *
 * Global Variables:
 * - `mainWindow`: Holds the reference to the main application window.
 */
const { dialog, Menu, app, BrowserWindow, ipcMain, nativeImage } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const dbPath = path.join(app.getPath("userData"), "fmk.db");
const db = new Database(dbPath);
let mainWindow;

/**
 * Sets up a custom dock menu for macOS.
 *
 * - Adds menu options to open reports and settings.
 * - Provides a "Quit" option to exit the application.
 * - Uses `app.whenReady()` to ensure the dock menu is set after the app initializes.
 *
 * This only runs on macOS (`process.platform === "darwin"`).
 */
if (process.platform === "darwin") {
  const dockMenu = Menu.buildFromTemplate([
    { label: "Open Reports", click: () => createReportsWindow() },
    { label: "Open Settings", click: () => createSettingsWindow() },
    { label: "Quit", role: "quit" },
  ]);

  app.whenReady().then(() => {
    app.dock.setMenu(dockMenu);
  });
}


/**
 * Ensures the database file exists, copying a default version if necessary.
 *
 * - Checks if the database file (`dbPath`) exists in the user data directory.
 * - If the database does not exist, attempts to copy a default `fmk.db` from the app directory.
 * - Prevents errors when the database file is missing on first launch.
 */
if (!fs.existsSync(dbPath)) {
  const sourceDbPath = path.join(__dirname, "fmk.db");
  if (fs.existsSync(sourceDbPath)) {
    fs.copyFileSync(sourceDbPath, dbPath);
  }
}



/**
 * Ensures the necessary database tables exist.
 *
 * - Creates the `projects` table if it does not already exist.
 * - Defines fields for tracking project status, including:
 *   - `id`: Auto-incrementing primary key.
 *   - `date_started`, `completed_date`: Store project start and completion dates.
 *   - `project_name`: Required field for the project title.
 *   - Boolean fields (`fabric_chosen`, `cut`, `pieced`, etc.) track project progress.
 *   - `archived`: Indicates if the project is archived (1) or active (0).
 *   - `deleted`: Marks if the project is deleted (1) but not permanently removed.
 *   - `position`: Stores the project's order in a list.
 *   - `important`: Flags the project as important.
 *
 * - Uses SQLite's `CREATE TABLE IF NOT EXISTS` to prevent duplicate table creation.
 */
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

/**
 * Retrieves all active (non-archived, non-deleted) project rows from the database.
 *
 * - Queries the `projects` table for items where `archived = 0` and `deleted = 0`.
 * - Returns a list of projects, including relevant details such as:
 *   - `id`, `date_started`, `completed_date`, `project_name`
 *   - Boolean progress fields (`fabric_chosen`, `cut`, `pieced`, etc.)
 *   - `important` status for flagged projects.
 * - If an error occurs, returns an empty array instead of crashing the application.
 *
 * @returns {Promise<Array<Object>>} A list of active projects or an empty array on failure.
 */
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

/**
 * Saves or updates a project in the database.
 *
 * - Validates required fields (`dateStarted`, `projectName`).
 * - If `data.id` exists, updates an existing row.
 * - If `data.id` is missing, inserts a new row and returns the new ID.
 * - Handles potential errors and returns a success or failure response.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {Object} data - The project data to save.
 * @param {string} data.dateStarted - The start date of the project (required).
 * @param {string} [data.completedDate] - The completion date (optional).
 * @param {string} data.projectName - The name of the project (required).
 * @param {number} data.fabricChosen - 1 if fabric is chosen, 0 otherwise.
 * @param {number} data.cut - 1 if cut, 0 otherwise.
 * @param {number} data.pieced - 1 if pieced, 0 otherwise.
 * @param {number} data.assembled - 1 if assembled, 0 otherwise.
 * @param {number} data.backPrepped - 1 if back prepped, 0 otherwise.
 * @param {number} data.basted - 1 if basted, 0 otherwise.
 * @param {number} data.quilted - 1 if quilted, 0 otherwise.
 * @param {number} data.bound - 1 if bound, 0 otherwise.
 * @param {number} data.photographed - 1 if photographed, 0 otherwise.
 * @param {number} data.important - 1 if marked important, 0 otherwise.
 * @returns {Promise<SaveRowResponse>} A success response or an error message.
 */
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


/**
 * Retrieves all archived project rows from the database with optional sorting.
 *
 * - Queries the `projects` table for items where `archived = 1`.
 * - Allows sorting by various columns (`sortBy`) in ascending or descending order (`sortOrder`).
 * - Prevents SQL injection by validating allowed column names and sort orders.
 * - Defaults to sorting by `completed_date` in descending order if invalid parameters are provided.
 * - If an error occurs, returns an empty array instead of crashing the application.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {string} [sortBy="completed_date"] - The column to sort by.
 * @param {string} [sortOrder="DESC"] - The sorting order (`"ASC"` or `"DESC"`).
 * @returns {Promise<Array<Object>>} A list of archived projects or an empty array on failure.
 */
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

/**
 * Archives or unarchives a project in the database.
 *
 * - Updates the `archived` status of a project in the `projects` table.
 * - If `isArchived` is `true`, the project is archived (`archived = 1`).
 * - If `isArchived` is `false`, the project is restored to active status (`archived = 0`).
 * - Returns a success response or an error message on failure.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {number} rowId - The ID of the project to archive or unarchive.
 * @param {boolean} isArchived - `true` to archive, `false` to restore.
 * @returns {Promise<ApiResponse>} A success response or an error message.
 */
ipcMain.handle("archiveRow", async (event, rowId, isArchived) => {
  try {
    db.prepare("UPDATE projects SET archived = ? WHERE id = ?").run(isArchived ? 1 : 0, rowId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Marks a project as deleted in the database.
 *
 * - Updates the `deleted` column to `1` to indicate soft deletion.
 * - The project is not permanently removed, allowing for restoration later.
 * - Returns a success response or an error message on failure.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {number} rowId - The ID of the project to delete.
 * @returns {Promise<ApiResponse>} A success response or an error message.
 */
ipcMain.handle("deleteRow", async (event, rowId) => {
  try {
    db.prepare("UPDATE projects SET deleted = 1 WHERE id = ?").run(rowId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Retrieves all deleted project rows from the database with optional sorting.
 *
 * - Queries the `projects` table for items where `deleted = 1`.
 * - Allows sorting by various columns (`sortBy`) in ascending or descending order (`sortOrder`).
 * - Prevents SQL injection by validating allowed column names and sort orders.
 * - Defaults to sorting by `completed_date` in descending order if invalid parameters are provided.
 * - If an error occurs, returns an empty array instead of crashing the application.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {string} [sortBy="completed_date"] - The column to sort by.
 * @param {string} [sortOrder="DESC"] - The sorting order (`"ASC"` or `"DESC"`).
 * @returns {Promise<Array<Object>>} A list of deleted projects or an empty array on failure.
 */
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

/**
 * Restores a deleted project by setting `deleted = 0`.
 *
 * - Updates the `deleted` column to restore the project.
 * - Keeps the `archived` status unchanged to ensure proper state restoration.
 * - Returns the project's archived status for UI updates.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {number} rowId - The ID of the project to restore.
 * @returns {Promise<RestoreResponse>} A success response or an error message.
 */
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

/**
 * Permanently deletes a single project from the database.
 *
 * - Removes the row from the `projects` table entirely.
 * - This action cannot be undone.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {number} rowId - The ID of the project to permanently delete.
 * @returns {Promise<ApiResponse>} - Contains success status and optional error message.
 */
ipcMain.handle("purgeDeletedRow", async (event, rowId) => {
  try {
    db.prepare("DELETE FROM projects WHERE id = ?").run(rowId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Permanently deletes all projects marked as deleted.
 *
 * - Removes all rows from the `projects` table where `deleted = 1`.
 * - This action cannot be undone.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @returns {Promise<ApiResponse>} - Contains success status and optional error message.
 */
ipcMain.handle("purgeDeletedRows", async () => {
  try {
    db.prepare("DELETE FROM projects WHERE deleted = 1").run();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


/**
 * Retrieves the total number of open (active) projects.
 *
 * - Counts projects where `archived = 0` and `deleted = 0`.
 * - Returns the total count or an error message if the query fails.
 *
 * @returns {Promise<CountResponse>} The total count or an error message.
 *          - `success`: Indicates if the operation was successful.
 *          - `total`: The number of active projects.
 *          - `error`: Contains the error message if the query fails.
 */
ipcMain.handle("getTotalOpenProjects", async () => {
  try {
    const result = db.prepare("SELECT COUNT(*) AS total FROM projects WHERE archived = 0 AND deleted = 0").get();
    return { success: true, total: result?.total || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Retrieves the total number of completed (archived) projects.
 *
 * - Counts projects where `archived = 1` and `deleted = 0`.
 * - Returns the total count or an error message if the query fails.
 *
 * @returns {Promise<CountResponse>} The total count or an error message.
 *          - `success`: Indicates if the operation was successful.
 *          - `total`: The number of completed projects.
 *          - `error`: Contains the error message if the query fails.
 */
ipcMain.handle("getTotalCompletedProjects", async () => {
  try {
    const result = db.prepare("SELECT COUNT(*) AS total FROM projects WHERE archived = 1 AND deleted = 0").get();
    return { success: true, total: result?.total || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Retrieves the number of open and completed projects within a date range.
 *
 * - Filters `date_started` for open projects.
 * - Filters `completed_date` for completed projects.
 * - Returns counts for both or an error message if the query fails.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event (unused in this function).
 * @param {string} startDate - The start of the date range (format: YYYY-MM-DD).
 * @param {string} endDate - The end of the date range (format: YYYY-MM-DD).
 * @returns {Promise<DateRangeResponse>} Project counts or an error message.
 *          - `openProjects`: The number of open projects within the range.
 *          - `completedProjects`: The number of completed projects within the range.
 *          - `error`: Contains the error message if the query fails.
 */
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


/**
 * Opens the Reports window when triggered from the renderer process.
 *
 * - Calls `createReportsWindow()` to initialize and display the Reports window.
 * - This allows the user to generate and view project reports.
 */
ipcMain.handle("openReports", () => {
  createReportsWindow();
});

/**
 * Opens the Settings window when triggered from the renderer process.
 *
 * - Calls `createSettingsWindow()` to initialize and display the Settings window.
 * - This allows users to configure application settings.
 */
ipcMain.handle("openSettings", () => {
  createSettingsWindow();
});

/**
 * Exports all project data to a JSON file.
 *
 * - Prompts the user to select a save location using a system dialog.
 * - Retrieves all projects from the database and writes them to a JSON file.
 * - Returns success or failure status with additional information.
 *
 * @returns {Promise<FileOperationResponse>} A success response or an error message.
 *          - `success`: Indicates if the export was successful.
 *          - `message`: Provides user feedback.
 *          - `filePath`: The location where the file was saved.
 *          - `error`: Contains an error message if the operation fails.
 */
ipcMain.handle("exportData", async () => {
  try {
    const filePath = dialog.showSaveDialogSync({
      title: "Export Data",
      defaultPath: "projects-backup.json",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (!filePath) {
      return { success: false, message: "Export canceled." };
    }

    const projects = db.prepare("SELECT * FROM projects").all();
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    return { success: true, message: "Data exported successfully!", filePath };
  } catch (error) {
    console.error("❌ Export error:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Imports project data from a JSON file.
 *
 * - Prompts the user to select a JSON file containing project data.
 * - Parses and inserts the data into the database.
 * - Uses a transaction to ensure data integrity.
 * - Returns success or failure status with additional information.
 *
 * @returns {Promise<FileOperationResponse>} A success response or an error message.
 *          - `success`: Indicates if the import was successful.
 *          - `message`: Provides user feedback.
 *          - `error`: Contains an error message if the operation fails.
 */
ipcMain.handle("importData", async () => {
  try {
    const filePaths = dialog.showOpenDialogSync({
      title: "Import Data",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"],
    });
    
    if (!filePaths || filePaths.length === 0) {
      return { success: false, message: "Import canceled." };
    }

    const jsonData = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));

    const insertStmt = db.prepare(`
      INSERT INTO projects (id, date_started, completed_date, project_name, 
        fabric_chosen, cut, pieced, assembled, back_prepped, basted, quilted, bound, 
        photographed, archived, deleted, position, important)
      VALUES (@id, @date_started, @completed_date, @project_name, @fabric_chosen, 
        @cut, @pieced, @assembled, @back_prepped, @basted, @quilted, @bound, 
        @photographed, @archived, @deleted, @position, @important)
    `);

    const insertMany = db.transaction((data) => {
      for (const row of data) {
        insertStmt.run(row);
      }
    });

    insertMany(jsonData);

    return { success: true, message: "Data imported successfully!" };
  } catch (error) {
    console.error("❌ Import error:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Creates and opens the Reports window.
 *
 * - Sets the window dimensions to 600x600 pixels.
 * - Loads `reports.html` to display reports.
 * - Uses `preload.js` to securely enable renderer-to-main process communication.
 */
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

/**
 * Creates and opens the Settings window.
 *
 * - Sets the window dimensions to 600x500 pixels.
 * - Loads `settings.html` for application settings.
 * - Uses `preload.js` for secure communication between processes.
 */
function createSettingsWindow() {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  settingsWindow.loadFile("settings.html");
}

/**
 * Creates and initializes the main application window.
 *
 * - Prevents multiple main windows from opening.
 * - Sets the window dimensions to 1675x800 pixels.
 * - Loads `index.html` as the main UI.
 * - Uses `preload.js` to enable secure inter-process communication.
 * - Displays the window only when it's ready to improve performance.
 * - Handles window close events:
 *   - On closure, sets `mainWindow` to `null`.
 *   - Exits the app when the window is closed (except on macOS).
 */
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

/**
 * Handles macOS-specific behavior when the app is reactivated.
 *
 * - On macOS, apps typically do not close fully when the last window is closed.
 * - This event ensures that if the app is reactivated (`app.on("activate")`),
 *   and no window exists, a new main window is created.
 */
app.on("activate", () => {
  if (!mainWindow) createWindow();
});

/**
 * Quits the app when all windows are closed, except on macOS.
 *
 * - On Windows and Linux, closing all windows fully exits the app (`app.quit()`).
 * - On macOS, the app remains running in the dock until manually quit by the user.
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/**
* Initializes the Electron application when it is ready.
*
* - Calls `createWindow()` to open the main application window.
* - On macOS, sets a custom dock icon using an `.icns` file.
*/
app.whenReady().then(() => {
  createWindow();

  if (process.platform === "darwin") {
    const iconPath = path.join(process.resourcesPath, "MyIcon.icns");
    const dockIcon = nativeImage.createFromPath(iconPath);
    app.dock.setIcon(dockIcon);
  }
});