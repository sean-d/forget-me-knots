document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.getElementById("archive-table");

    // Fetch archived items from Electron main process
    const archivedRows = await window.electronAPI.getArchivedRows();

    archivedRows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = row.id; // Store ID in the row for easy selection
        tr.innerHTML = `
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
          </td>
        `;
        tableBody.appendChild(tr);
    });
});

async function restoreRow(rowId) {
    const response = await window.electronAPI.archiveRow(rowId, false); // Set archived to false

    if (response.success) {
        alert("Item restored!");

        // Find the row by its data-id and remove it
        const rowToRemove = document.querySelector(`tr[data-id="${rowId}"]`);
        if (rowToRemove) {
            rowToRemove.remove();
        }
    } else {
        alert("Error restoring item: " + response.error);
    }
}