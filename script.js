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
     <button class="delete" onclick="deleteRow(this)">delete</button>`
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

