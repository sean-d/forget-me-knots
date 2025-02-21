/**
 * Loads deleted items when the page is fully loaded.
 *
 * - Calls `loadDeletedItems()` to fetch and display deleted projects.
 * - Sorts by `"completed_date"` in descending order (`"DESC"`) by default.
 * - Ensures the table is populated with deleted projects when the user opens the deleted items view.
 */
document.addEventListener("DOMContentLoaded", () => {
    loadDeletedItems("completed_date", "DESC"); // Default sorting
});

/**
 * Tracks the current sorting column and order for deleted items.
 *
 * - `currentSortColumn`: Stores the active column used for sorting (default: `"completed_date"`).
 * - `currentSortOrder`: Tracks whether sorting is in ascending (`"ASC"`) or descending (`"DESC"`) order.
 * - These variables are used in `sortDeleted()` to toggle sorting preferences.
 */
let currentSortColumn = "completed_date";
let currentSortOrder = "DESC";

/**
 * Sorts the deleted items table by the selected column and reloads the data.
 *
 * - Toggles the sort order (ascending/descending) if the same column is clicked consecutively.
 * - Sets the default sort order to ascending (`"ASC"`) when switching to a new column.
 * - Calls `loadDeletedItems()` to refresh the table with updated sorting preferences.
 *
 * @param {string} column - The column name to sort by.
 */
function sortDeleted(column) {
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === "ASC" ? "DESC" : "ASC"; // Toggle order
    } else {
        currentSortColumn = column;
        currentSortOrder = "ASC"; // Default to ascending when switching column
    }
    loadDeletedItems(currentSortColumn, currentSortOrder); // Reload with new sorting
}


/**
 * Loads deleted project items from the database and populates the deleted items table.
 *
 * - Fetches deleted items from the Electron API with optional sorting.
 * - Clears the table before inserting new data.
 * - If no deleted items exist, displays a message instead.
 * - Populates each row with project details and action buttons for restoring or permanent deletion.
 * - Handles errors gracefully and logs them to the console.
 *
 * @param {string} [sortBy="completed_date"] - The column to sort by.
 * @param {string} [sortOrder="DESC"] - The sorting order (`"ASC"` or `"DESC"`).
 * @returns {Promise<void>}
 */
async function loadDeletedItems(sortBy = "completed_date", sortOrder = "DESC") {
    const tableBody = document.getElementById("deleted-table");

    if (!tableBody) {
        console.error("Table body not found!");
        return;
    }

    try {
        const deletedRows = await window.electronAPI.getDeletedRows(sortBy, sortOrder);
        tableBody.innerHTML = ""; // Clear table before repopulating

        if (!deletedRows || deletedRows.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='13'>No deleted items found.</td></tr>";
            return;
        }

        deletedRows.forEach((row) => {
            const tr = document.createElement("tr");
            tr.dataset.id = row.id;

            if (row.important) tr.classList.add("important");

            tr.innerHTML = `
        <td>${row.date_started || "N/A"}</td>
        <td>${row.completed_date || "N/A"}</td>
        <td>${row.project_name || "N/A"}</td>
        <td>${row.fabric_chosen ? "✔" : "✘"}</td>
        <td>${row.cut ? "✔" : "✘"}</td>
        <td>${row.pieced ? "✔" : "✘"}</td>
        <td>${row.assembled ? "✔" : "✘"}</td>
        <td>${row.back_prepped ? "✔" : "✘"}</td>
        <td>${row.basted ? "✔" : "✘"}</td>
        <td>${row.quilted ? "✔" : "✘"}</td>
        <td>${row.bound ? "✔" : "✘"}</td>
        <td>${row.photographed ? "✔" : "✘"}</td>
        <td>
          <button class="done" onclick="restoreDeletedRow(${row.id})">Restore</button>
          <button class="delete" onclick="purgeRow(${row.id})">Delete</button>
        </td>
      `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading deleted items:", error);
    }
}


/**
 * Restores a deleted project by setting `deleted = 0` in the database.
 *
 * - Calls the Electron API to restore the project.
 * - Removes the restored row from the UI immediately.
 * - Redirects the user based on the project's archived status:
 *   - If archived (`response.archived === 1`), redirects to `"archive.html"`.
 *   - Otherwise, redirects to `"index.html"`.
 * - Alerts the user if restoration is successful or if an error occurs.
 *
 * @param {number} rowId - The ID of the project to restore.
 * @returns {Promise<void>}
 */
async function restoreDeletedRow(rowId) {
    const response = await window.electronAPI.restoreDeletedRow(rowId);

    if (response.success) {
        alert("Item restored!");

        // Remove row from UI immediately
        document.querySelector(`tr[data-id="${rowId}"]`)?.remove();

        // Redirect based on archived status
        if (response.archived === 1) {
            window.location.href = "archive.html"; // Send to archive
        } else {
            window.location.href = "index.html"; // Send to main page
        }
    } else {
        alert("Error restoring item: " + response.error);
    }
}

/**
 * Permanently deletes a single deleted project from the database.
 *
 * - Prompts the user for confirmation before deleting.
 * - Calls the Electron API to remove the project permanently.
 * - If successful, removes the row from the UI.
 * - Alerts the user about the success or failure of the operation.
 *
 * @param {number} rowId - The ID of the project to permanently delete.
 * @returns {Promise<void>}
 */
async function purgeRow(rowId) {
    const confirmPurge = confirm("Are you sure you want to permanently delete this item?");
    if (!confirmPurge) return;

    const response = await window.electronAPI.purgeDeletedRow(rowId);

    if (response.success) {
        alert("Item permanently deleted!");
        document.querySelector(`tr[data-id="${rowId}"]`)?.remove(); // Remove from UI
    } else {
        alert("Error purging item: " + response.error);
    }
}

/**
 * Permanently deletes all projects marked as deleted.
 *
 * - Prompts the user for confirmation before deleting all deleted projects.
 * - Calls the Electron API to purge all deleted items from the database.
 * - If successful, clears the deleted items table in the UI.
 * - Alerts the user about the success or failure of the operation.
 *
 * @returns {Promise<void>}
 */
async function purgeDeletedItems() {
    const confirmPurge = confirm("Are you sure you want to permanently delete ALL deleted items?");
    if (!confirmPurge) return;

    const response = await window.electronAPI.purgeDeletedRows();

    if (response.success) {
        alert("All deleted items have been permanently removed!");
        document.getElementById("deleted-table").innerHTML = ""; // Clear UI
    } else {
        alert("Error purging items: " + response.error);
    }
}

/**
 * Loads deleted items when the page is fully loaded.
 *
 * - Calls `loadDeletedItems()` to fetch and display deleted projects.
 * - Ensures the deleted items table is populated on page initialization.
 * - This event listener prevents manually triggering `loadDeletedItems()`.
 */
window.addEventListener("DOMContentLoaded", loadDeletedItems);