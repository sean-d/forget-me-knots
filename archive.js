document.addEventListener("DOMContentLoaded", () => {
    loadArchivedItems("completed_date", "DESC"); // Default: Show most recent first
});

async function loadArchivedItems(sortBy, sortOrder) {
    const tableBody = document.getElementById("archive-table");

    // Fetch archived items from Electron main process, passing sorting options
    const archivedRows = await window.electronAPI.getArchivedRows(sortBy, sortOrder);

    // Clear existing rows
    tableBody.innerHTML = "";

    // Re-populate table with sorted archived items
    archivedRows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = row.id;
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
    <button class="restore" onclick="restoreRow(${row.id})">Restore</button>
    <button class="delete" onclick="deleteRow(${row.id})">Delete</button>
  </td>
    `;
        tableBody.appendChild(tr);
    });
}

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