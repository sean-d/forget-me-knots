/**
 * Adds a new row to the table for project tracking.
 *
 * The row includes:
 * - Checkboxes for various project milestones.
 * - Date inputs for start and completion dates.
 * - A textarea for the project name.
 * - Buttons for saving, marking as done, and deleting the row.
 *
 * Functionality:
 * - Toggles the "important" class when the "important" checkbox is clicked.
 * - Adds event listeners to handle "Save," "Done," and "Delete" actions.
 */
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

/**
 * Marks a project row as done or restores it from the archive.
 *
 * - Ensures the row is saved before marking it as done.
 * - Prevents archiving if the project name is empty.
 * - Calls the Electron main process to update archive status.
 * - Updates UI by removing archived items or restoring them.
 * - Toggles the button text between "Done" and "Undo".
 *
 * @param {HTMLButtonElement} button - The button that triggered the action.
 * @returns {Promise<void>}
 */
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

/**
 * Saves the data from a project row to the database.
 *
 * - Ensures the project name is provided before saving.
 * - Collects all checkbox states and date values.
 * - Sends data to the Electron main process for storage.
 * - Updates the row with a new ID if it was newly created.
 * - Displays success or error messages based on the response.
 *
 * @param {HTMLButtonElement} button - The button that triggered the save action.
 * @returns {Promise<void>}
 */
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

/**
 * Deletes a project row from the table and database.
 *
 * - Prompts the user for confirmation before deleting.
 * - If the row is unsaved (has no ID), it is simply removed from the UI.
 * - If the row is saved, it sends a request to delete it from the database.
 * - Updates the UI by removing the row upon successful deletion.
 *
 * @param {HTMLButtonElement} button - The button that triggered the delete action.
 * @returns {Promise<void>}
 */
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

/**
 * Loads active (non-archived) project rows from the database and populates the table.
 *
 * - Retrieves active items from the Electron API.
 * - Ensures the table body exists before populating data.
 * - Displays a message in the console if no active items are found.
 * - Dynamically creates and inserts table rows with appropriate data.
 * - Adds event listeners for marking important items, saving, completing, and deleting.
 *
 * @returns {Promise<void>}
 */
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

/**
 * Toggles the "important" status of a project row.
 *
 * - Prevents row click events from interfering with the checkbox.
 * - Immediately applies or removes the "important" class for styling.
 * - If the row is new (no `rowId`), it does not attempt to update the database.
 * - If the row exists, it updates the importance status in the database via Electron API.
 *
 * @param {Event} event - The click event triggered by the checkbox.
 * @param {number | null} rowId - The ID of the row (null for unsaved rows).
 * @returns {Promise<void>}
 */
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

/**
*  Ensures that active project items are loaded as soon as the page finishes loading.
*/
 document.addEventListener("DOMContentLoaded", () => {
  loadActiveItems(); // Ensure items load when page opens
});


/**
 * Adds an event listener to open reports when the page loads.
 *
 * - Waits for the DOM to be fully loaded before executing.
 * - Finds the "Open Reports" button by its ID (`open-reports`).
 * - If the button exists, attaches a click event listener.
 * - Calls the Electron API to open reports when clicked.
 */
document.addEventListener("DOMContentLoaded", () => {
  const openReportsBtn = document.getElementById("open-reports");
  if (openReportsBtn) {
    openReportsBtn.addEventListener("click", () => {
      window.electronAPI.openReports();
    });
  }
});