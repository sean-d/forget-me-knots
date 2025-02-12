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


const existingRow = document.querySelector("table tr:nth-child(2)");

function markAsDone(button) {
  const row = button.closest("tr");
  const inputs = row.querySelectorAll("input, textarea");

  if (button.textContent === "done") {
    // Mark as completed
    row.style.backgroundColor = "#e6ffe6";
    inputs.forEach((input) => {
      input.disabled = true;
    });
    button.textContent = "un-done";
    button.classList.remove("done");
    button.classList.add("un-done");
    button.style.backgroundColor = "black"; // Change to black
  } else {
    // Revert to incomplete
    row.style.backgroundColor = "";
    inputs.forEach((input) => {
      input.disabled = false;
    });
    button.textContent = "done";
    button.classList.remove("un-done");
    button.classList.add("done");
    button.style.backgroundColor = ""; // Reset to original color
  }
}


async function saveRow(button) {
  const row = button.closest("tr");
  let rowId = row.dataset.id || null; // Retrieve existing ID if available

  const data = {
    id: rowId, // Include ID for update check
    completedDate: row.querySelector('input[type="date"]').value,
    projectName: row.querySelector("textarea").value,
    fabricChosen: row.querySelectorAll('input[type="checkbox"]')[0].checked,
    cut: row.querySelectorAll('input[type="checkbox"]')[1].checked,
    pieced: row.querySelectorAll('input[type="checkbox"]')[2].checked,
    assembled: row.querySelectorAll('input[type="checkbox"]')[3].checked,
    backPrepped: row.querySelectorAll('input[type="checkbox"]')[4].checked,
    basted: row.querySelectorAll('input[type="checkbox"]')[5].checked,
    quilted: row.querySelectorAll('input[type="checkbox"]')[6].checked,
    bound: row.querySelectorAll('input[type="checkbox"]')[7].checked,
    photographed: row.querySelectorAll('input[type="checkbox"]')[8].checked,
  };

  // Send data to Electron's main process
  const response = await window.electronAPI.saveRow(data);

  if (response.success) {
    if (!rowId) {
      row.dataset.id = response.id; // Store the new ID in the row
    }
    alert("Row saved successfully!");
  } else {
    alert("Error saving row.");
  }
}

async function deleteRow(button) {
  const row = button.closest("tr");
  const rowId = row.dataset.id; // Get row ID

  if (!rowId) {
    alert("This item hasn't been saved yet.");
    row.remove(); // Remove unsaved row from UI
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete this item?");
  if (!confirmDelete) return;

  // Send delete request to the Electron main process
  const response = await window.electronAPI.deleteRow(rowId);

  if (response.success) {
    row.remove(); // Remove row from UI after successful deletion from DB
    alert("Item deleted successfully!");
  } else {
    alert("Error deleting item: " + response.error);
  }
}