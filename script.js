function addRow() {
  const table = document.querySelector("table");
  const newRow = table.insertRow();

  const cells = [
    '<input type="date" />',
    "<textarea></textarea>",
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    '<input type="checkbox" />',
    `<button class="done" onclick="markAsDone(this)">done</button> 
     <button class="delete" onclick="deleteRow(this)">delete</button>
     <button class="save" onclick="saveRow(this)">save</button>`
  ];

  cells.forEach((cell, index) => {
    const newCell = newRow.insertCell();
    newCell.innerHTML = cell;

    // Ensure buttons have correct styles
    if (index === 11) {
      const buttons = newCell.querySelectorAll("button");
      buttons[0].classList.add("done"); // Green "done" button
      buttons[1].classList.add("delete"); // Red "delete" button
    }
  });
}

async function markAsDone(button) {
  const row = button.closest("tr");
  const rowId = row.dataset.id;

  if (!rowId) {
    alert("This item must be saved before marking it as done.");
    return;
  }

  // Check if project name is empty before archiving
  const projectName = row.querySelector("textarea").value.trim();
  if (!projectName) {
    alert("Project Name is required before marking as done!");
    row.querySelector("textarea").focus();
    return;
  }

  // First, save the row to ensure all changes are stored
  await saveRow(button);

  const isCurrentlyArchived = button.textContent === "Undo"; // If "Undo", it's archived

  // Send archive request to Electron main process
  const response = await window.electronAPI.archiveRow(rowId, !isCurrentlyArchived);

  if (response.success) {
    if (!isCurrentlyArchived) {
      row.remove(); // Remove from active list if newly archived
      alert("Item moved to archive!");
    } else {
      alert("Item restored!"); // Undo brings it back to active list
    }

    // Toggle button text
    button.textContent = isCurrentlyArchived ? "Done" : "Undo";
  } else {
    alert("Error updating archive status: " + response.error);
  }
}


async function saveRow(button) {
  const row = button.closest("tr");
  let rowId = row.dataset.id || null; // Retrieve existing ID if available

  const projectName = row.querySelector("textarea").value.trim();

  // Check if project name is empty
  if (!projectName) {
    alert("Project Name is required!");
    row.querySelector("textarea").focus();
    return; // Stop function execution
  }

  const data = {
    id: rowId, // Include ID for update check
    completedDate: row.querySelector('input[type="date"]').value,
    projectName: projectName, // Use trimmed project name
    fabricChosen: Number(row.querySelectorAll('input[type="checkbox"]')[0].checked),
    cut: Number(row.querySelectorAll('input[type="checkbox"]')[1].checked),
    pieced: Number(row.querySelectorAll('input[type="checkbox"]')[2].checked),
    assembled: Number(row.querySelectorAll('input[type="checkbox"]')[3].checked),
    backPrepped: Number(row.querySelectorAll('input[type="checkbox"]')[4].checked),
    basted: Number(row.querySelectorAll('input[type="checkbox"]')[5].checked),
    quilted: Number(row.querySelectorAll('input[type="checkbox"]')[6].checked),
    bound: Number(row.querySelectorAll('input[type="checkbox"]')[7].checked),
    photographed: Number(row.querySelectorAll('input[type="checkbox"]')[8].checked),
  };

  const response = await window.electronAPI.saveRow(data);

  if (response.success) {
    if (!rowId) {
      row.dataset.id = response.id; // Store the new ID
    }
    alert("Row saved successfully!");
  } else {
    alert("Error saving row: " + response.error);
  }
}

async function deleteRow(button) {
  const row = button.closest("tr");
  const rowId = row.dataset.id; // Get row ID

  // Always ask for confirmation before deleting
  const confirmDelete = confirm("Are you sure you wish to delete this?");
  if (!confirmDelete) return;

  if (!rowId) {
    // If row is not saved, just remove it from the UI
    row.remove();
    return;
  }

  // If row is saved, delete it from the database
  const response = await window.electronAPI.deleteRow(rowId);

  if (response.success) {
    row.remove(); // Remove row from UI
    alert("Item deleted successfully!");
  } else {
    alert("Error deleting item: " + response.error);
  }
}

async function loadActiveItems() {
  const tableBody = document.querySelector("table tbody");

  if (!tableBody) {
    console.error("Table body not found!");
    return;
  }

  // Fetch active (non-archived) items from the database
  const activeRows = await window.electronAPI.getActiveRows();

  if (!activeRows.length) {
    console.log("No active items found.");
  }

  // Clear only rows, keeping the header
  tableBody.innerHTML = `
    <tr>
      <th>Completed Date</th>
      <th>Project Name</th>
      <th>Fabric Chosen</th>
      <th>Cut</th>
      <th>Pieced</th>
      <th>Assembled</th>
      <th>Back Prepped</th>
      <th>Basted</th>
      <th>Quilted</th>
      <th>Bound</th>
      <th>Photographed</th>
      <th>Actions</th>
    </tr>
  `;

  // Populate table with active items
  activeRows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;
    tr.innerHTML = `
      <td><input type="date" value="${row.completed_date || ""}" /></td>
      <td><textarea>${row.project_name || ""}</textarea></td>
      <td><input type="checkbox" ${row.fabric_chosen ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.cut ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.pieced ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.assembled ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.back_prepped ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.basted ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.quilted ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.bound ? "checked" : ""} /></td>
      <td><input type="checkbox" ${row.photographed ? "checked" : ""} /></td>
      <td>
        <button class="done" onclick="markAsDone(this)">Done</button>
        <button class="delete" onclick="deleteRow(this)">Delete</button>
        <button class="save" onclick="saveRow(this)">Save</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Load active items when the page loads
document.addEventListener("DOMContentLoaded", loadActiveItems);

// Load active items when the page loads
document.addEventListener("DOMContentLoaded", loadActiveItems);