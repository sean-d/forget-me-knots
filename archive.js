document.addEventListener("DOMContentLoaded", () => {
    loadArchivedItems("completed_date", "DESC"); // Default: Show most recent first
});

let currentSortColumn = "completed_date"; // Default sorting column
let currentSortOrder = "DESC"; // Default order

async function loadArchivedItems() {
    const tableBody = document.getElementById("archive-table");

    if (!tableBody) {
        console.error("Table body not found!");
        return;
    }

    // Fetch archived items from the database, sorted by current column and order
    const archivedRows = await window.electronAPI.getArchivedRows(currentSortColumn, currentSortOrder);

    tableBody.innerHTML = ""; // Clear table before repopulating

    archivedRows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = row.id;
        tr.innerHTML = `
      <td>${row.date_started || "N/A"}</td>  <!-- Start Date -->
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
        <button class="restore" onclick="restoreRow(${row.id})">Restore</button>
        <button class="delete" onclick="deleteRow(${row.id})">Delete</button>
      </td>
    `;
        tableBody.appendChild(tr);
    });
}

// Function to change sorting column & reload the table
function sortArchive(column) {
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === "ASC" ? "DESC" : "ASC"; // Toggle order
    } else {
        currentSortColumn = column;
        currentSortOrder = "ASC"; // Default to ascending when switching column
    }
    loadArchivedItems(); // Reload with new sorting
}

// Load archived items on page load
window.addEventListener("DOMContentLoaded", loadArchivedItems);

async function restoreRow(rowId) {
    const response = await window.electronAPI.archiveRow(rowId, false);

    if (response.success) {
        alert("Item restored!");

        // Remove row from archive page without refreshing
        document.querySelector(`tr[data-id="${rowId}"]`)?.remove();
    } else {
        alert("Error restoring item: " + response.error);
    }
}

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