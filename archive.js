/**
 * Defines the default sorting column and order for archived items.
 *
 * - `currentSortColumn`: Stores the active column used for sorting (default: `"completed_date"`).
 * - `currentSortOrder`: Tracks whether sorting is in ascending (`"ASC"`) or descending (`"DESC"`) order.
 * - `DOMContentLoaded` event ensures archived items are loaded when the page loads.
 */
let currentSortColumn = "completed_date";
let currentSortOrder = "DESC";
window.addEventListener("DOMContentLoaded", loadArchivedItems);

/**
 * Loads archived items when the page is fully loaded.
 *
 * - Calls `loadArchivedItems()` to fetch and display archived projects.
 * - Sorts by `"completed_date"` in descending order (`"DESC"`) by default.
 * - Ensures the table is populated with archived projects when the user opens the archive view.
 */
document.addEventListener("DOMContentLoaded", () => {
    loadArchivedItems("completed_date", "DESC"); // Default: Show most recent first
});

/**
 * Sorts the archived items table by the selected column and reloads the data.
 *
 * - Toggles the sort order (ascending/descending) if the same column is clicked consecutively.
 * - Sets the default sort order to ascending (`"ASC"`) when switching to a new column.
 * - Calls `loadArchivedItems()` to reload the table with the updated sorting preferences.
 *
 * @param {string} column - The column name to sort by.
 */
function sortArchive(column) {
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === "ASC" ? "DESC" : "ASC"; // Toggle order
    } else {
        currentSortColumn = column;
        currentSortOrder = "ASC"; // Default to ascending when switching column
    }
    loadArchivedItems(currentSortColumn, currentSortOrder); // Reload with new sorting
}

/**
 * Loads archived project items from the database and populates the archive table.
 *
 * - Fetches archived items from the Electron API with optional sorting.
 * - Clears the table before repopulating it with new data.
 * - If no archived items exist, displays a message instead.
 * - Populates each row with project details and action buttons for restoration or deletion.
 * - Handles errors gracefully and logs them to the console.
 *
 * @param {string} [sortBy="completed_date"] - The column to sort by.
 * @param {string} [sortOrder="DESC"] - The sorting order (`"ASC"` or `"DESC"`).
 * @returns {Promise<void>}
 */
async function loadArchivedItems(sortBy = "completed_date", sortOrder = "DESC") {
    const tableBody = document.getElementById("archive-table");

    if (!tableBody) {
        console.error("Table body not found!");
        return;
    }

    try {
        const archivedRows = await window.electronAPI.getArchivedRows(sortBy, sortOrder);
        tableBody.innerHTML = ""; // Clear table before repopulating

        if (!archivedRows || archivedRows.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='13'>No archived projects found.</td></tr>";
            return;
        }

        archivedRows.forEach((row) => {
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
          <button class="done" onclick="restoreRow(${row.id})">Restore</button>
          <button class="delete" onclick="deleteRow(${row.id})">Delete</button>
        </td>
      `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading archived items:", error);
    }
}



/**
 * Restores an archived project item back to the active list.
 *
 * - Sends a request to the Electron API to unarchive the item.
 * - If successful, removes the row from the archive table.
 * - Displays a success message upon restoration.
 * - Alerts the user if an error occurs during the process.
 *
 * @param {number} rowId - The ID of the archived row to be restored.
 * @returns {Promise<void>}
 */
async function restoreRow(rowId) {
    const response = await window.electronAPI.archiveRow(rowId, false);

    if (response.success) {
        alert("Item restored!");
        document.querySelector(`tr[data-id="${rowId}"]`)?.remove();
    } else {
        alert("Error restoring item: " + response.error);
    }
}

/**
 * Deletes an archived project item permanently.
 *
 * - Prompts the user for confirmation before deleting.
 * - Sends a request to the Electron API to delete the item from the database.
 * - If successful, removes the row from the UI.
 * - Displays an alert indicating success or failure.
 *
 * @param {number} rowId - The ID of the archived row to be deleted.
 * @returns {Promise<void>}
 */
async function deleteRow(rowId) {
    const confirmDelete = confirm("Are you sure you wish to delete this archived item?");
    if (!confirmDelete) return;

    const response = await window.electronAPI.deleteRow(rowId);

    if (response.success) {
        alert("Item moved to Deleted Items!");
        document.querySelector(`tr[data-id="${rowId}"]`)?.remove(); // Remove from UI
    } else {
        alert("Error deleting item: " + response.error);
    }
}