let tableCount = 0;

// Function to update the main job title
function updateJobTitle() {
  const title = document.getElementById("jobTitleInput").value;
  document.getElementById("mainTitle").textContent =
    title || "T-Shirt Inventory Receiver";
}

function addStyleTable() {
  tableCount++;  // Increment tableCount to track the number of tables
  const tableDiv = document.createElement('div');
  tableDiv.classList.add('styleTable');
  tableDiv.setAttribute('id', `styleTable${tableCount}`);
  tableDiv.innerHTML = `
      <h2>Shirt Style ${tableCount}</h2>
      <input type="text" placeholder="Enter Shirt Style Title" oninput="updateTableTitle(this)">
      <table>
          <thead>
              <tr>
                  <th class="drag-handle-header"></th>
                  <th>Size</th>
                  <th>Expected</th>
                  <th>Received</th>
                  <th>+/-</th>
                  <th>Remove</th>
              </tr>
          </thead>
          <tbody id="shirtRows${tableCount}">
              <tr draggable="true">
                  <td class="drag-handle">⋮⋮</td>
                  <td>S</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr draggable="true">
                  <td class="drag-handle">⋮⋮</td>
                  <td>M</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr draggable="true">
                  <td class="drag-handle">⋮⋮</td>
                  <td>L</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr draggable="true">
                  <td class="drag-handle">⋮⋮</td>
                  <td>XL</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr draggable="true">
                  <td class="drag-handle">⋮⋮</td>
                  <td>2XL</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
          </tbody>
      </table>
      <div class="button-container">
          <button type="button" onclick="addRow(${tableCount})">Add Size</button>
          <button type="button" onclick="removeStyleTable(${tableCount})" class="remove-style-button">Remove Shirt Style</button>
          <button type="button" onclick="addStyleTable()">Add Another Shirt Style</button>
      </div>
  `;
  document.getElementById('tablesContainer').appendChild(tableDiv);

  // Add drag and drop event listeners to all rows
  const tbody = document.getElementById(`shirtRows${tableCount}`);
  setupDragAndDrop(tbody);

  updateRemoveButtons(); // Check and update the state of the remove buttons

  generateSummary(); // Update summary after adding a new style
}

function removeStyleTable(tableNumber) {
  document.getElementById(`styleTable${tableNumber}`).remove();
  tableCount--;  // Decrement tableCount

  updateRemoveButtons(); // Check and update the state of the remove buttons

  generateSummary(); // Update summary after removing a style
}

function updateRemoveButtons() {
  const removeButtons = document.querySelectorAll('.remove-style-button');
  if (tableCount <= 1) {
      removeButtons.forEach(button => button.disabled = true);  // Disable all remove buttons if only one style remains
  } else {
      removeButtons.forEach(button => button.disabled = false); // Enable remove buttons if more than one style exists
  }
}

// Function to update the title of each shirt style table
function updateTableTitle(input) {
  const title = input.value;
  const h2 = input.previousElementSibling;
  h2.textContent = title || `Shirt Style ${h2.textContent.split(" ")[2]}`;
  generateSummary();
}

// Function to calculate the difference for each row
function calculateDifference(input) {
  const row = input.closest("tr");
  const expected =
    parseInt(row.querySelector('input[name="expected"]').value) || 0;
  const received =
    parseInt(row.querySelector('input[name="received"]').value) || 0;
  const difference = received - expected;
  row.querySelector(".difference").textContent =
    difference === 0
      ? "even"
      : difference > 0
      ? `+${difference}`
      : `${difference}`;
  generateSummary();
}

// Function to add a new row for a t-shirt size in a specific table
function addRow(tableNumber) {
  const row = document.createElement('tr');
  row.setAttribute('draggable', 'true');
  row.innerHTML = `
      <td class="drag-handle">⋮⋮</td>
      <td><input type="text" id="additional-size-input" name="size" placeholder="(size)"></td>
      <td><input type="number" name="expected" placeholder="Expected" oninput="calculateDifference(this)"></td>
      <td><input type="number" name="received" placeholder="Received" oninput="calculateDifference(this)"></td>
      <td class="difference">---</td>
      <td><button type="button" onclick="removeRow(this)">Remove</button></td>
  `;
  const tbody = document.getElementById(`shirtRows${tableNumber}`);
  tbody.appendChild(row);

  // Add drag and drop event listeners to the new row
  setupDragAndDrop(tbody);

  generateSummary(); // Update summary after adding a new size
}


// Function to remove a specific row
function removeRow(button) {
  const row = button.parentElement.parentElement;
  row.remove();
  generateSummary();
}

// Function to generate a summary of all the tables
function generateSummary() {
  console.log("Generating summary...");
  console.log("Table Count:", tableCount);

  let summaryText = "";
  for (let i = 1; i <= tableCount; i++) {
      const tableDiv = document.getElementById(`styleTable${i}`);
      console.log(`Checking table: styleTable${i}`, tableDiv);

      if (tableDiv) {
          const styleTitle = tableDiv.querySelector('h2').textContent.trim();
          console.log(`Found table with title: ${styleTitle}`);

          const rows = tableDiv.querySelectorAll('tbody tr');
          console.log(`Number of rows found in ${styleTitle}: ${rows.length}`);

          let styleSummary = ""; // This will store the summary for the current style

          rows.forEach((row, index) => {
              console.log(`Row ${index + 1} HTML:`, row.innerHTML);

              // Updated to account for drag handle column - size is now in 2nd column
              const sizeElement = row.querySelector('td:nth-child(2)');
              const sizeInput = sizeElement.querySelector('input[name="size"]');
              const size = sizeInput ? sizeInput.value.trim() : sizeElement.textContent.trim();
              const expectedInput = row.querySelector('input[name="expected"]');
              const receivedInput = row.querySelector('input[name="received"]');

              if (size && expectedInput && receivedInput) {
                  const expected = parseInt(expectedInput.value) || 0;
                  const received = parseInt(receivedInput.value) || 0;
                  const difference = received - expected;
                  
                  // Only include in summary if there is a difference
                  if (difference !== 0) {
                      const status = difference > 0 ? `+${difference}` : `${difference}`;
                      styleSummary += `${size}: ${status}\n`;
                      console.log(`Processed Size ${size} with Difference ${status}`);
                  }
              } else {
                  console.log("One or more inputs missing in this row");
              }
          });

          if (styleSummary) {
              summaryText += `${styleTitle}:\n${styleSummary}\n`;
          }
      } else {
          console.log(`Table styleTable${i} not found`);
      }
  }

  document.getElementById('summaryBlock').innerText = summaryText.trim();
  console.log("Summary Text:", summaryText);
}

// Function to copy the summary text to the clipboard
function copyToClipboard() {
  const summaryText = document.getElementById('summaryBlock').innerText;
  
  // Create a temporary textarea element to hold the text to be copied
  const textarea = document.createElement('textarea');
  textarea.value = summaryText;
  document.body.appendChild(textarea);
  
  // Select and copy the text from the textarea
  textarea.select();
  document.execCommand('copy');
  
  // Remove the textarea element from the document
  document.body.removeChild(textarea);
  
  alert('Summary copied to clipboard!');
}


// Drag and Drop functionality
let draggedRow = null;

function setupDragAndDrop(tbody) {
  const rows = tbody.querySelectorAll('tr[draggable="true"]');

  rows.forEach(row => {
    // Remove existing listeners to prevent duplicates
    row.removeEventListener('dragstart', handleDragStart);
    row.removeEventListener('dragover', handleDragOver);
    row.removeEventListener('drop', handleDrop);
    row.removeEventListener('dragend', handleDragEnd);
    row.removeEventListener('dragenter', handleDragEnter);
    row.removeEventListener('dragleave', handleDragLeave);

    // Add event listeners
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragend', handleDragEnd);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragleave', handleDragLeave);
  });
}

function handleDragStart(e) {
  draggedRow = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedRow) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedRow !== this) {
    // Get the parent tbody
    const tbody = this.parentNode;
    const allRows = [...tbody.querySelectorAll('tr[draggable="true"]')];
    const draggedIndex = allRows.indexOf(draggedRow);
    const targetIndex = allRows.indexOf(this);

    // Determine where to insert the dragged row
    if (draggedIndex < targetIndex) {
      // Insert after the target
      tbody.insertBefore(draggedRow, this.nextSibling);
    } else {
      // Insert before the target
      tbody.insertBefore(draggedRow, this);
    }

    generateSummary();
  }

  this.classList.remove('drag-over');
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');

  // Remove drag-over class from all rows
  const tbody = this.parentNode;
  const rows = tbody.querySelectorAll('tr[draggable="true"]');
  rows.forEach(row => {
    row.classList.remove('drag-over');
  });
}

// Automatically add the first shirt style table when the page loads
window.onload = addStyleTable;
