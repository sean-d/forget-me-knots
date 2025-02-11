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
    '<button onclick="markAsDone(this)">done</button> <button onclick="deleteRow(this)">delete</button>',
  ];
  cells.forEach((cell) => {
    const newCell = newRow.insertCell();
    newCell.innerHTML = cell;
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
  } else {
    // Revert to incomplete
    row.style.backgroundColor = "";
    inputs.forEach((input) => {
      input.disabled = false;
    });
    button.textContent = "done";
  }
}

