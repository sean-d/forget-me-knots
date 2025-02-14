document.addEventListener("DOMContentLoaded", () => {
    loadDeletedItems("completed_date", "DESC"); // Default sorting
});

let currentSortColumn = "completed_date"; // Default sorting column
let currentSortOrder = "DESC"; // Default sorting order

function sortDeleted(column) {
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === "ASC" ? "DESC" : "ASC"; // Toggle order
    } else {
        currentSortColumn = column;
        currentSortOrder = "ASC"; // Default to ascending when switching column
    }
    loadDeletedItems(currentSortColumn, currentSortOrder); // Reload with new sorting
}

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
          <button class="restore" onclick="restoreDeletedRow(${row.id})">Restore</button>
          <button class="purge" onclick="purgeRow(${row.id})">Purge</button>
        </td>
      `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading deleted items:", error);
    }
}

// Load deleted items on page load
window.addEventListener("DOMContentLoaded", loadDeletedItems);

// Load deleted items on page load
window.addEventListener("DOMContentLoaded", loadDeletedItems);

// Restore deleted item
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

// Permanently delete a single row
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

// Permanently delete all deleted items
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