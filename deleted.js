document.addEventListener("DOMContentLoaded", () => {
    loadDeletedItems("completed_date", "DESC"); // Default sorting
});

async function loadDeletedItems(sortBy, sortOrder) {
    const tableBody = document.getElementById("deleted-table");

    // Fetch deleted items from Electron main process
    const deletedRows = await window.electronAPI.getDeletedRows(sortBy, sortOrder);

    // Clear table
    tableBody.innerHTML = "";

    if (!deletedRows || deletedRows.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='3'>No deleted items found.</td></tr>";
        return;
    }

    deletedRows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = row.id;
        tr.innerHTML = `
      <td>${row.completed_date || "N/A"}</td>
      <td>${row.project_name || "N/A"}</td>
      <td>
        <button class="restore" onclick="restoreDeleted(${row.id})">Restore</button>
      </td>
    `;
        tableBody.appendChild(tr);
    });
}

async function restoreDeleted(rowId) {
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