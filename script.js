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

function deleteRow(button) {
  const row = button.parentNode.parentNode;
  row.parentNode.removeChild(row);
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


// async function saveRow(button) {
//   const row = button.closest("tr");
//   const inputs = row.querySelectorAll("input, textarea");
//
//   const rowData = {
//     completed_date: inputs[0].value || null,
//     project_name: inputs[1].value || "",
//     fabric_chosen: inputs[2].checked ? 1 : 0,
//     cut: inputs[3].checked ? 1 : 0,
//     pieced: inputs[4].checked ? 1 : 0,
//     assembled: inputs[5].checked ? 1 : 0,
//     back_prepped: inputs[6].checked ? 1 : 0,
//     basted: inputs[7].checked ? 1 : 0,
//     quilted: inputs[8].checked ? 1 : 0,
//     bound: inputs[9].checked ? 1 : 0,
//     photographed: inputs[10].checked ? 1 : 0,
//   };
//
//   // Send data to Electron for saving in SQLite
//   const response = await window.electronAPI.saveRow(rowData);
//
//   if (response.success) {
//     alert("Row saved successfully!");
//   } else {
//     alert("Error saving row.");
//   }
// }

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