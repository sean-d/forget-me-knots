function addRow() {
  const table = document.querySelector("table tbody"); // Ensure tbody is targeted
  const newRow = table.insertRow();

  newRow.innerHTML = `
    <td>
      <input type="checkbox" class="important-checkbox" />
    </td>
    <td><input type="date" class="date-started" /></td>
    <td><input type="date" class="date-completed" /></td>
    <td><textarea class='project-name'></textarea></td>
    <td><input type="checkbox" class="fabric-chosen" /></td>
    <td><input type="checkbox" class="cut" /></td>
    <td><input type="checkbox" class="pieced" /></td>
    <td><input type="checkbox" class="assembled" /></td>
    <td><input type="checkbox" class="back-prepped" /></td>
    <td><input type="checkbox" class="basted" /></td>
    <td><input type="checkbox" class="quilted" /></td>
    <td><input type="checkbox" class="bound" /></td>
    <td><input type="checkbox" class="photographed" /></td>
    <td>
      <button class="save">Save</button>
      <button class="done">Done</button> 
      <button class="delete">Delete</button>

    </td>
  `;

  // ✅ Add event listener to toggle background immediately
  const importantCheckbox = newRow.querySelector(".important-checkbox");
  importantCheckbox.addEventListener("click", (event) => {
    newRow.classList.toggle("important", event.target.checked);
  });

  // ✅ Add event listeners for buttons
  newRow.querySelector(".done").addEventListener("click", () => markAsDone(newRow.querySelector(".done")));
  newRow.querySelector(".delete").addEventListener("click", () => deleteRow(newRow.querySelector(".delete")));
  newRow.querySelector(".save").addEventListener("click", () => saveRow(newRow.querySelector(".save")));
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
  let rowId = row.dataset.id || null;

  const projectName = row.querySelector("textarea").value.trim();

  if (!projectName) {
    alert("Project Name is required!");
    row.querySelector("textarea").focus();
    return;
  }

  const data = {
    id: rowId,
    dateStarted: row.querySelector("input[type='date']").value,
    completedDate: row.querySelectorAll("input[type='date']")[1].value,
    projectName: projectName,
    fabricChosen: Number(row.querySelectorAll("input[type='checkbox']")[1].checked),
    cut: Number(row.querySelectorAll("input[type='checkbox']")[2].checked),
    pieced: Number(row.querySelectorAll("input[type='checkbox']")[3].checked),
    assembled: Number(row.querySelectorAll("input[type='checkbox']")[4].checked),
    backPrepped: Number(row.querySelectorAll("input[type='checkbox']")[5].checked),
    basted: Number(row.querySelectorAll("input[type='checkbox']")[6].checked),
    quilted: Number(row.querySelectorAll("input[type='checkbox']")[7].checked),
    bound: Number(row.querySelectorAll("input[type='checkbox']")[8].checked),
    photographed: Number(row.querySelectorAll("input[type='checkbox']")[9].checked),
    important: Number(row.querySelectorAll("input[type='checkbox']")[0].checked) // ✅ Added Important field
  };

  const response = await window.electronAPI.saveRow(data);

  if (response.success) {
    if (!rowId) {
      row.dataset.id = response.id; // ✅ Assign the new ID
    }
    alert("Row saved successfully!");
  } else {
    alert("Error saving row: " + response.error);
  }
}

async function deleteRow(button) {
  const row = button.closest("tr");
  const rowId = row.dataset.id; // Get row ID

  const confirmDelete = confirm("Are you sure you wish to delete this?");
  if (!confirmDelete) return;

  if (!rowId) {
    row.remove(); // If row isn't saved, just remove it from UI
    return;
  }

  // Mark the item as deleted in the database
  const response = await window.electronAPI.deleteRow(rowId);

  if (response.success) {
    row.remove(); // Remove from active list
    alert("Item moved to Deleted Items!");
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

  // ✅ Ensure ALL correct headers are included
  tableBody.innerHTML = `
    <tr>
      <th>Important</th>
      <th>Start Date</th>
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

    // Apply "important" styling if row is marked
    if (row.important) tr.classList.add("important");

    tr.innerHTML = `
      <td>
        <input type="checkbox" ${row.important ? "checked" : ""} 
          onclick="toggleImportant(event, ${row.id})" />
      </td>
      <td><input type="date" value="${row.date_started || ""}" /></td>
      <td><input type="date" value="${row.completed_date || ""}" /></td>
      <td><textarea class="project-name">${row.project_name || ""}</textarea></td>
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
        <button class="save" onclick="saveRow(this)">Save</button>
        <button class="done" onclick="markAsDone(this)">Done</button>
        <button class="delete" onclick="deleteRow(this)">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

async function toggleImportant(event, rowId) {
  event.stopPropagation(); // Prevent row click from interfering

  const row = event.target.closest("tr");
  const isChecked = event.target.checked; // Get checkbox state

  // ✅ Apply the "important" class immediately
  if (isChecked) {
    row.classList.add("important");
  } else {
    row.classList.remove("important");
  }

  // ✅ If rowId is null, it's a new row and should not try to update the database
  if (!rowId) return;

  // Save to the database if the row already has an ID
  await window.electronAPI.markImportant(rowId, isChecked ? 1 : 0);
}


// Load active items when the page loads
document.addEventListener("DOMContentLoaded", () => {
  loadActiveItems(); // Ensure items load when page opens
});

async function toggleImportant(event, rowId) {
  event.stopPropagation(); // Prevent row click from interfering

  const row = document.querySelector(`tr[data-id="${rowId}"]`);
  const isChecked = row.classList.toggle("important"); // Toggle class

  // Save to the database
  await window.electronAPI.markImportant(rowId, isChecked ? 1 : 0);
}