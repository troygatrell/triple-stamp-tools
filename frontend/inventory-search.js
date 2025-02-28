// let allData = []; // Global variable to store the data //

// --- Data Loading (from your server) ---

async function loadData() {
  try {
    const response = await fetch(
      "https://inventory-search.onrender.com/api/inventory"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory: ${response.status}`);
    }

    allData = await response.json();

    allData = allData.map((item) => ({ id: item._id, ...item })); //Keep id, and all other data

    allData.forEach((item) => delete item._id); //remove original

    allData = sortData(allData); // Sort the data initially

    setupSearch(allData);

    console.log("Data loaded from server");
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// --- Search Setup ---

function setupSearch(data) {
  const searchInput = document.getElementById("search-input");

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();

    if (!searchTerm) {
      displayResults([]);

      return;
    }

    const results = data.filter((item) =>
      item.value.toLowerCase().includes(searchTerm)
    );

    displayResults(results);
  });
}

// --- Display Results & Editing ---

function displayResults(results) {
  const resultsContainer = document.getElementById("search-results");

  resultsContainer.innerHTML = ""; // Clear previous results

  let lastYear = "";

  results.forEach((item) => {
    // No index needed

    const resultItem = document.createElement("div");

    resultItem.className = "result-item";

    resultItem.dataset.id = item.id; // Store the MongoDB document ID

    resultItem.dataset.sheetName = item.sheet;

    resultItem.dataset.originalValue = item.originalValue;

    //Added the dataset for original month/year

    resultItem.dataset.originalSheet = item.originalSheet;

    resultItem.dataset.originalMonth = item.originalMonth;

    let yearColumn = "";

    if (item.sheet !== lastYear) {
      yearColumn = `<div class="result-column result-year">${item.sheet}</div>`;

      lastYear = item.sheet;
    } else {
      yearColumn = `<div class="result-column result-year"></div>`;
    }

    resultItem.innerHTML = `

${yearColumn}

<div class="result-column result-month">${item.month}</div>

<div class="result-column result-value">${item.value}</div>

<div class="result-column result-buttons">

<button class="edit-button" data-index="${item.id}">Edit</button>

<button class="delete-button" data-index="${item.id}">Delete</button>

</div>

`;

    resultsContainer.appendChild(resultItem);
  });
}

// --- Event Delegation Setup ---

//Modified

function setupEditButtonDelegation() {
  const resultsContainer = document.getElementById("search-results");

  resultsContainer.addEventListener("click", (event) => {
    // Check if the clicked element is either an edit or a delete button
    if (
      event.target.classList.contains("edit-button") ||
      event.target.classList.contains("delete-button")
    ) {
      const resultItem = event.target.closest(".result-item");
      const itemId = resultItem.dataset.id;

      // Check if itemId is valid before proceeding
      if (itemId) {
        const item = allData.find((item) => item.id === itemId);

        if (item) {
          // If the edit button was pressed, proceed with editEntryUI
          if (event.target.classList.contains("edit-button")) {
            editEntryUI(resultItem, item);
          }
          // If the delete button was pressed, proceed with deleteEntry
          else if (event.target.classList.contains("delete-button")) {
            deleteEntry(resultItem, item);
          }
        } else {
          console.error("Could not find item in allData with ID:", itemId);
        }
      } else {
        console.error("Result Item is missing data-id attribute");
      }
    }
  });
}

// --- Sort Data Function ---

function sortData(data) {
  const monthOrder = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
  };

  return data.sort((a, b) => {
    // 1. Check if either entry has a non-numeric year
    const aIsText = isNaN(parseInt(a.sheet));
    const bIsText = isNaN(parseInt(b.sheet));

    if (aIsText && !bIsText) {
      return 1; // a goes to the bottom
    } else if (!aIsText && bIsText) {
      return -1; // b goes to the bottom
    }

    // 2. If both or neither are text, sort by year in reverse order
    if (b.sheet !== a.sheet) {
      return b.sheet.localeCompare(a.sheet);
    }

    // 3. If years are the same, sort by month in reverse order
    return monthOrder[b.month] - monthOrder[a.month];
  });
}

// --- Edit Entry UI ---

//Modified

async function editEntryUI(resultItem, item) {
  const yearDiv = resultItem.querySelector(".result-year");
  const monthDiv = resultItem.querySelector(".result-month");
  const valueDiv = resultItem.querySelector(".result-value");
  const buttonsDiv = resultItem.querySelector(".result-buttons");

  // 1. Prompt for passkey
  const passkey = prompt("Enter passkey:");

  // 2. Send passkey to authentication endpoint
  try {
    const response = await fetch('/api/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey })
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    const token = data.token;

    // 3. Store the token (e.g., in local storage)
    localStorage.setItem('authToken', token);

  } catch (error) {
    console.error('Authentication error:', error);
    alert('Invalid passkey');
    return; // Exit the function if authentication fails
  }

  // --- If authentication is successful, proceed with setting up the edit UI ---

  yearDiv.dataset.originalContent = yearDiv.innerHTML;
  monthDiv.dataset.originalContent = monthDiv.innerHTML;
  valueDiv.dataset.originalContent = valueDiv.innerHTML;

  yearDiv.innerHTML = `<input type="text" class="edit-year" value="${item.sheet}">`;
  monthDiv.innerHTML = `<input type="text" class="edit-month" value="${item.month}">`;
  valueDiv.innerHTML = `<input type="text" class="edit-value" value="${item.value}">`;

  buttonsDiv.innerHTML = `
    <button class="save-button">Save</button>
    <button class="cancel-button">Cancel</button>
    <button class="restore-button">Restore</button>
    <button class="delete-button">Delete</button>
  `;

  const saveButton = buttonsDiv.querySelector(".save-button");
  const cancelButton = buttonsDiv.querySelector(".cancel-button");
  const restoreButton = buttonsDiv.querySelector(".restore-button");
  const deleteButton = buttonsDiv.querySelector(".delete-button");

  saveButton.addEventListener("click", () => saveChanges(resultItem, item));
  cancelButton.addEventListener("click", () => cancelChanges(resultItem, item));
  restoreButton.addEventListener("click", () => restoreOriginal(resultItem, item));
  deleteButton.addEventListener("click", () => deleteEntry(resultItem, item));
}

// --- Cancel Changes ---

function cancelChanges(resultItem, item) {
  //if item exists

  if (item) {
    const yearDiv = resultItem.querySelector(".result-year");

    const monthDiv = resultItem.querySelector(".result-month");

    const valueDiv = resultItem.querySelector(".result-value");

    const buttonsDiv = resultItem.querySelector(".result-buttons");

    // 1. Update allData with old values

    const index = allData.findIndex((i) => i.id === item.id);

    if (index !== -1) {
      allData[index].value = item.value; //Update with the correct original value.

      allData[index].sheet = item.sheet;

      allData[index].month = item.month;
    }

    // 2. Update the *displayed* values (outside of edit mode):

    yearDiv.innerHTML = item.sheet;

    monthDiv.innerHTML = item.month;

    valueDiv.innerHTML = item.value;

    // 3. Switch back to the Edit button:

    buttonsDiv.innerHTML = `<button class="edit-button" data-index="${resultItem.dataset.id}">Edit</button>

<button class="delete-button" data-index="${resultItem.dataset.id}">Delete</button>`;
  } else {
    //If there is no item, it was canceled.

    resultItem.remove();
  }
}

// --- Restore Original ---

function restoreOriginal(resultItem, item) {
  const yearDiv = resultItem.querySelector(".result-year");

  const monthDiv = resultItem.querySelector(".result-month");

  const valueDiv = resultItem.querySelector(".result-value");

  const buttonsDiv = resultItem.querySelector(".result-buttons");

  // 1. Show Confirmation Dialog

  if (confirm("Discard all edits and revert to original values?")) {
    // 2. Update allData values:

    const index = allData.findIndex((i) => i.id === item.id);

    if (index !== -1) {
      allData[index].value = item.originalValue; //Update with the correct original value.

      allData[index].sheet = item.originalSheet;

      allData[index].month = item.originalMonth;
    }

    // 3. Update the *input field* values (stay in edit mode):

    yearDiv.querySelector("input").value = item.originalSheet;

    monthDiv.querySelector("input").value = item.originalMonth;

    valueDiv.querySelector("input").value = item.originalValue;

    // 4. Update item

    item.value = item.originalValue;

    item.sheet = item.originalSheet;

    item.month = item.originalMonth;

    // 5. *Don't* switch back to the "Edit" button. Leave the edit UI active.

    // buttonsDiv.innerHTML = `<button class="edit-button" data-index="${item.id}">Edit</button>`; // REMOVE THIS LINE

    // We do *not* call saveChanges here.
  }
}

// --- Save Changes (to your server) ---

//Modified

async function saveChanges(resultItem, item) {
  const year = resultItem.querySelector(".edit-year")?.value;
  const month = resultItem.querySelector(".edit-month")?.value;
  const newValue = resultItem.querySelector(".edit-value")?.value;

  // Check if it's a new entry (no item.id) or an existing entry
  if (item) {
    // Existing entry: Update
    const updatedItem = {
      sheet: year,
      month: month,
      value: newValue,
      originalValue: item.originalValue,
      originalSheet: item.originalSheet,
      originalMonth: item.originalMonth,
    };

    try {
      const response = await fetch(
        `https://inventory-search.onrender.com/api/inventory/${item.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedItem),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to update entry: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      // Update the display and allData *after* successful save
      const index = allData.findIndex((i) => i.id === item.id);
      if (index !== -1) {
        allData[index] = { id: item.id, ...updatedItem }; // Keep the existing ID
      }

      // Update the display *after* successful save
      resultItem.querySelector(".result-year").innerHTML = updatedItem.sheet;
      resultItem.querySelector(".result-month").innerHTML = updatedItem.month;
      resultItem.querySelector(".result-value").innerHTML = updatedItem.value;

      item.value = newValue; //Also update item
      item.sheet = year;
      item.month = month;

      // Update the buttons after saving an existing item
      const buttonsDiv = resultItem.querySelector(".result-buttons");
      buttonsDiv.innerHTML = `<button class="edit-button" data-index="${item.id}">Edit</button>
                               <button class="delete-button" data-index="${item.id}">Delete</button>`;
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to save changes. See console for details.");
      return; // Exit the function on error
    }
  } else {
    // New entry: Create
    const newItem = {
      sheet: year,
      month: month,
      value: newValue,
      originalValue: newValue, // For a new entry, original is the same as new
      originalSheet: year,
      originalMonth: month,
    };

    try {
      const response = await fetch(
        "https://inventory-search.onrender.com/api/inventory",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newItem),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create entry: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const createdItem = await response.json(); // Get the created item (with _id) from the server

      allData.push({ id: createdItem._id, ...createdItem }); // Add to allData

      allData = sortData(allData); // Sort allData after adding new entry

      // Update the display (add the new item ONLY)
      displayResults([createdItem]); // Display only the created item

      // --- Automatically refresh the page after a short delay ---
      setTimeout(() => {
        location.reload(); // Refresh the page
      }, 500); // Delay of 500 milliseconds (0.5 seconds)

      // Add data-index to buttons for new entry
      const buttonsDiv = resultItem.querySelector(".result-buttons");
      buttonsDiv.innerHTML = `<button class="edit-button" data-index="${createdItem._id}">Edit</button>
                               <button class="delete-button" data-index="${createdItem._id}">Delete</button>`;
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Failed to save new entry. See console for details.");
      return; // Exit the function on error
    }
  }
}

// --- Create New Entry UI (NEW FUNCTION) ---

function createNewEntryUI() {
  const resultsContainer = document.getElementById("search-results");

  const resultItem = document.createElement("div");

  resultItem.className = "result-item";

  // Create the input fields directly, with placeholders. NO data-id yet.

  resultItem.innerHTML = `

<div class="result-column result-year"><input type="text" class="edit-year" placeholder="Year"></div>

<div class="result-column result-month"><input type="text" class="edit-month" placeholder="Month"></div>

<div class="result-column result-value"><input type="text" class="edit-value" placeholder="Value"></div>

<div class="result-column result-buttons">

<button class="save-button">Save</button>

<button class="cancel-button">Cancel</button>

</div>

`;

  resultsContainer.prepend(resultItem); // Add to the *beginning* of the results

  const saveButton = resultItem.querySelector(".save-button");

  const cancelButton = resultItem.querySelector(".cancel-button");

  saveButton.addEventListener("click", () => saveChanges(resultItem, null)); // Pass null for item

  cancelButton.addEventListener("click", () => cancelChanges(resultItem, null)); // Pass null for item
}

// --- Delete Entry (NEW FUNCTION) ---

//CORRECTED

async function deleteEntry(resultItem, item) {
  if (confirm("Are you sure you want to delete this entry?")) {
    try {
      const response = await fetch(
        `https://inventory-search.onrender.com/api/inventory/${item.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json(); //try getting json

        throw new Error(
          `Failed to delete entry: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        ); //give specific error
      }

      //assuming a good response, we remove from allData

      allData = allData.filter((i) => i.id !== item.id);

      // Remove from the DOM

      resultItem.remove();
    } catch (error) {
      console.error("Error deleting item:", error);

      alert("Failed to delete entry. See console for details.");
    }
  }
}

// --- Initial Load ---

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupEditButtonDelegation();

  // Add event listener for the "New Entry" button:
  const newEntryButton = document.getElementById("new-entry-button");
  newEntryButton.addEventListener("click", createNewEntryUI);
});
