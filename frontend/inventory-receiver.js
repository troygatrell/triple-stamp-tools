let tableCount = 0;

// Function to update the main job title
function updateJobTitle() {
  const jobTitleInput = document.getElementById("jobTitleInput");
  const title = jobTitleInput ? jobTitleInput.value.trim() : "";
  const mainTitle = document.getElementById("mainTitle");

  if (mainTitle) {
    mainTitle.textContent = title || "Check-In Assistant";
  }

  generateSummary();
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
                  <th>Size</th>
                  <th>Expected</th>
                  <th>Received</th>
                  <th>+/-</th>
                  <th>Remove</th>
              </tr>
          </thead>
          <tbody id="shirtRows${tableCount}">
              <tr>
                  <td>S</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
                  <td>M</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
                  <td>L</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
                  <td>XL</td>
                  <td><input type="number" name="expected" placeholder="Expected " oninput="calculateDifference(this)"></td>
                  <td><input type="number" name="received" placeholder="Received " oninput="calculateDifference(this)"></td>
                  <td class="difference">---</td>
                  <td><button type="button" onclick="removeRow(this)">Remove</button></td>
              </tr>
              <tr>
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
          <button type="button" onclick="addStyleTable()">Add Shirt Style</button>
          <button type="button" onclick="removeStyleTable(${tableCount})" class="remove-style-button">Remove Shirt Style</button>
      </div>
  `;
  document.getElementById('tablesContainer').appendChild(tableDiv);

  updateRemoveButtons(); // Check and update the state of the remove buttons
  initializeRowSorting(); // Enable drag-and-drop sorting

  generateSummary(); // Update summary after adding a new style
}

function removeStyleTable(tableNumber) {
  const table = document.getElementById(`styleTable${tableNumber}`);
  if (table) {
    table.remove();
    updateRemoveButtons(); // Check and update the state of the remove buttons
    generateSummary(); // Update summary after removing a style
  }
}

function updateRemoveButtons() {
  const removeButtons = document.querySelectorAll('.remove-style-button');
  const styleTables = document.querySelectorAll('#tablesContainer .styleTable');
  const onlyOneTableLeft = styleTables.length <= 1;

  removeButtons.forEach(button => {
    button.disabled = onlyOneTableLeft;
  });
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
  row.innerHTML = `
      <td><input type="text" id="additional-size-input" name="size" placeholder="(size)"></td>
      <td><input type="number" name="expected" placeholder="Expected" oninput="calculateDifference(this)"></td>
      <td><input type="number" name="received" placeholder="Received" oninput="calculateDifference(this)"></td>
      <td class="difference">---</td>
      <td><button type="button" onclick="removeRow(this)">Remove</button></td>
  `;
  const tbody = document.getElementById(`shirtRows${tableNumber}`);
  tbody.appendChild(row);

  enableSortableForBody(tbody); // Refresh sortable behavior after adding a row

  generateSummary(); // Update summary after adding a new size
}


// Function to remove a specific row
function removeRow(button) {
  const row = button.parentElement.parentElement;
  row.remove();
  generateSummary();
}

function formatDateForSummary(value) {
  if (!value) {
    return "";
  }

  const parts = value.split("-");
  if (parts.length !== 3) {
    return value;
  }

  const [year, month, day] = parts;
  if (!year || !month || !day) {
    return value;
  }

  return `${month}-${day}-${year}`;
}

function getHeaderValues() {
  const jobName =
    (document.getElementById("jobTitleInput")?.value || "").trim();
  const receiverName =
    (document.getElementById("receiverNameInput")?.value || "").trim();
  const receivedDateRaw =
    (document.getElementById("receivedDateInput")?.value || "").trim();
  const poNumber =
    (document.getElementById("poNumberInput")?.value || "").trim();

  return {
    jobName,
    receiverName,
    receivedDate: formatDateForSummary(receivedDateRaw),
    poNumber
  };
}

// Function to generate a summary of all the tables
function generateSummary() {
  const summaryLines = [];
  const { jobName, receiverName, receivedDate, poNumber } = getHeaderValues();

  const headerParts = [];
  if (jobName) {
    headerParts.push(jobName);
  }
  if (poNumber) {
    headerParts.push(`PO ${poNumber}`);
  }
  if (receivedDate) {
    headerParts.push(receivedDate);
  }

  const headerLines = [];
  if (headerParts.length > 0) {
    headerLines.push(headerParts.join(" - "));
  }
  if (receiverName) {
    headerLines.push(`Receiver: ${receiverName}`);
  }
  if (headerLines.length > 0) {
    summaryLines.push(...headerLines);
    summaryLines.push("--------------------------------------------------------------");
  }

  let hasDifferences = false;
  const styleTables = document.querySelectorAll("#tablesContainer .styleTable");

  styleTables.forEach((table) => {
    const titleElement = table.querySelector("h2");
    const styleTitle = titleElement
      ? titleElement.textContent.trim()
      : "Shirt Style";
    const rows = table.querySelectorAll("tbody tr");
    const styleLines = [];

    rows.forEach((row) => {
      const sizeCell = row.querySelector("td:first-child");
      if (!sizeCell) {
        return;
      }

      const sizeInput = sizeCell.querySelector('input[name="size"]');
      const size = sizeInput
        ? sizeInput.value.trim() || "(size)"
        : sizeCell.textContent.trim();

      const expectedInput = row.querySelector('input[name="expected"]');
      const receivedInput = row.querySelector('input[name="received"]');

      if (!expectedInput || !receivedInput) {
        return;
      }

      const expectedRaw = expectedInput.value.trim();
      const receivedRaw = receivedInput.value.trim();
      if (!expectedRaw && !receivedRaw) {
        return;
      }

      const expected = parseInt(expectedRaw, 10) || 0;
      const received = parseInt(receivedRaw, 10) || 0;
      const difference = received - expected;

      const differenceText =
        difference === 0
          ? "even"
          : difference > 0
          ? `+${difference}`
          : `${difference}`;

      styleLines.push(`${size}: ${differenceText}`);
    });

    if (styleLines.length > 0) {
      hasDifferences = true;
      summaryLines.push(`${styleTitle}:`);
      summaryLines.push(...styleLines);
      summaryLines.push("");
    }
  });

  if (!hasDifferences && styleTables.length > 0) {
    summaryLines.push("All quantities even.");
  } else if (
    summaryLines.length > 0 &&
    summaryLines[summaryLines.length - 1] === ""
  ) {
    summaryLines.pop();
  }

  const summaryText = summaryLines.join("\n").trim();
  const summaryTextarea = document.getElementById("summaryBlock");

  if (summaryTextarea) {
    summaryTextarea.value = summaryText;
  }

  const copyButton = document.getElementById("copy-summary-btn");
  if (copyButton) {
    copyButton.disabled = summaryText.length === 0;
  }
}

// Function to copy the summary text to the clipboard
function copyToClipboard() {
  const summaryTextarea = document.getElementById("summaryBlock");
  if (!summaryTextarea) {
    return;
  }

  const summaryText = summaryTextarea.value.trim();
  if (!summaryText) {
    alert("No summary to copy yet.");
    return;
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => alert("Summary copied to clipboard!"))
      .catch(() => fallbackCopy(summaryText));
  } else {
    fallbackCopy(summaryText);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);

  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);

  alert("Summary copied to clipboard!");
}


// Automatically add the first shirt style table when the page loads
function initializeCheckInAssistant() {
  const receivedDateInput = document.getElementById("receivedDateInput");
  if (receivedDateInput && !receivedDateInput.value) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    receivedDateInput.value = `${year}-${month}-${day}`;
  }

  addStyleTable();

  const headerInputIds = [
    "receiverNameInput",
    "receivedDateInput",
    "poNumberInput"
  ];

  headerInputIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", generateSummary);
    }
  });

  // Ensure copy button state reflects initial summary content
  generateSummary();
}

window.addEventListener("load", initializeCheckInAssistant);

function initializeRowSorting() {
  const bodies = document.querySelectorAll("#tablesContainer .styleTable tbody");
  bodies.forEach(enableSortableForBody);
}

function enableSortableForBody(tbody) {
  if (!tbody || !window.jQuery || !jQuery.fn.sortable) {
    return;
  }

  const $tbody = $(tbody);

  if ($tbody.data("uiSortable")) {
    $tbody.sortable("destroy");
  }

  $tbody.sortable({
    axis: "y",
    items: "> tr",
    cursor: "move",
    helper: function (e, ui) {
      ui.children().each(function () {
        $(this).width($(this).width());
      });
      return ui;
    },
    stop: () => generateSummary()
  });
}
