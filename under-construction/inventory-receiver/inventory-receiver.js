let tableCount = 0;

// Function to update the main job title
function updateJobTitle() {
  const title = document.getElementById("jobTitleInput").value;
  document.getElementById("mainTitle").textContent =
    title || "T-Shirt Inventory Receiver";
}

// Function to add a new shirt style table
function addStyleTable() {
  tableCount++;  // Increment tableCount to track the number of tables
  const tableDiv = document.createElement('div');
  tableDiv.classList.add('styleTable');
  tableDiv.setAttribute('id', `styleTable${tableCount}`);
  tableDiv.innerHTML = `
      <h2>Shirt Style ${tableCount}</h2>
      <input type="text" placeholder="Enter Shirt Style Title" style="width: 100%; margin-bottom: 10px;" oninput="updateTableTitle(this)">
      <table>
          <thead>
              <tr>
                  <th>Size</th>
                  <th>Expected</th>
                  <th>Received</th>
                  <th>Difference</th>
                  <th>Action</th>
              </tr>
          </thead>
          <tbody id="shirtRows${tableCount}">
              <tr>
                  <td>S</td>
                  <td><input type="number" name="expected" placeholder="Expected Quantity" oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received Quantity" oninput="calculateDifference(this)"></td>
                  <td class="difference">even</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
                  <td>M</td>
                  <td><input type="number" name="expected" placeholder="Expected Quantity" oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received Quantity" oninput="calculateDifference(this)"></td>
                  <td class="difference">even</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
                  <td>L</td>
                  <td><input type="number" name="expected" placeholder="Expected Quantity" oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received Quantity" oninput="calculateDifference(this)"></td>
                  <td class="difference">even</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
                  <td>XL</td>
                  <td><input type="number" name="expected" placeholder="Expected Quantity" oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received Quantity" oninput="calculateDifference(this)"></td>
                  <td class="difference">even</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
                  <td>2XL</td>
                  <td><input type="number" name="expected" placeholder="Expected Quantity" oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received Quantity" oninput="calculateDifference(this)"></td>
                  <td class="difference">even</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
          </tbody>
      </table>
      <button type="button" onclick="addRow(${tableCount})">Add Size</button>
      <div class="remove-btn" onclick="removeStyleTable(${tableCount})">Remove Shirt Style</div>
  `;
  document.getElementById('tablesContainer').appendChild(tableDiv);

  // Immediately call generateSummary after adding a new table
  generateSummary();
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

// Function to remove a shirt style table
function removeStyleTable(tableNumber) {
  const tableDiv = document.getElementById(`styleTable${tableNumber}`);
  tableDiv.remove();
  generateSummary();
}

// Function to add a new row for a t-shirt size in a specific table
function addRow(tableNumber) {
  const row = document.createElement('tr');
  row.innerHTML = `
      <td><input type="text" name="size" placeholder="Enter Size (e.g., 3XL)"></td>
      <td><input type="number" name="expected" placeholder="Expected Quantity" oninput="calculateDifference(this)"></td>
      <td><input type="number" name="received" placeholder="Received Quantity" oninput="calculateDifference(this)"></td>
      <td class="difference">even</td>
      <td><button type="button" onclick="removeRow(this)">Remove</button></td>
  `;
  document.getElementById(`shirtRows${tableNumber}`).appendChild(row);
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
              
              const sizeElement = row.querySelector('td:nth-child(1)');
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


// Automatically add the first shirt style table when the page loads
window.onload = addStyleTable;
