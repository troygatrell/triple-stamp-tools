let allData =[] // Global variable to store the data

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

    // Add the _id from MongoDB to each item as a property called 'id'
    allData = allData.map((item) => ({ id: item._id, ...item }));

    // Remove the original _id property from each item
    allData.forEach((item) => delete item._id);

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
      displayResults();
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
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";

    // Store the MongoDB document ID in the dataset
    resultItem.dataset.id = item.id;
    resultItem.dataset.sheetName = item.sheet;
    resultItem.dataset.originalValue = item.originalValue;

    // Store the original month/year in the dataset
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

      if (itemId) {
        const item = allData.find((item) => item.id === itemId);

        if (item) {
          if (event.target.classList.contains("edit-button")) {
            editEntryUI(resultItem, item);
          } else if (event.target.classList.contains("delete-button")) {
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

function editEntryUI(resultItem, item) {
  const yearDiv = resultItem.querySelector(".result-year");
  const monthDiv = resultItem.querySelector(".result-month");
  const valueDiv = resultItem.querySelector(".result-value");
  const buttonsDiv = resultItem.querySelector(".result-buttons");

  // Store original values in the dataset
  yearDiv.dataset.originalContent = yearDiv.innerHTML;
  monthDiv.dataset.originalContent = monthDiv.innerHTML;
  valueDiv.dataset.originalContent = valueDiv.innerHTML;

  // Replace content with input fields
  yearDiv.innerHTML = `<input type="text" class="edit-year" value="${item.sheet}">`;
  monthDiv.innerHTML = `<input type="text" class="edit-month" value="${item.month}">`;
  valueDiv.innerHTML = `<input type="text" class="edit-value" value="${item.value}">`;

  buttonsDiv.innerHTML = `
        <button class="save-button">Save</button>
        <button class="cancel-button">Cancel</button>
        <button class="restore-button">Restore</button>
        <button class="delete-button">Delete</button>
    `;

  // Add event listeners to the buttons
  const saveButton = buttonsDiv.querySelector(".save-button");
  const cancelButton = buttonsDiv.querySelector(".cancel-button");
  const restoreButton = buttonsDiv.querySelector(".restore-button");
  const deleteButton = buttonsDiv.querySelector(".delete-button");

  saveButton.addEventListener("click", () => saveChanges(resultItem, item));
  cancelButton.addEventListener("click", () => cancelChanges(resultItem, item));
  restoreButton.addEventListener("click", () =>
    restoreOriginal(resultItem, item)
  );
  deleteButton.addEventListener("click", () => deleteEntry(resultItem, item));
}

// --- Cancel Changes ---

function cancelChanges(resultItem, item) {
  if (item) {
    const yearDiv = resultItem.querySelector(".result-year");
    const monthDiv = resultItem.querySelector(".result-month");
    const valueDiv = resultItem.querySelector(".result-value");
    const buttonsDiv = resultItem.querySelector(".result-buttons");

    // Update allData with old values
    const index = allData.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      allData[index].value = item.value;
      allData[index].sheet = item.sheet;
      allData[index].month = item.month;
    }

    // Update the displayed values (outside of edit mode)
    yearDiv.innerHTML = item.sheet;
    monthDiv.innerHTML = item.month;
    valueDiv.innerHTML = item.value;

    // Switch back to the Edit button
    buttonsDiv.innerHTML = `<button class="edit-button" data-index="${resultItem.dataset.id}">Edit</button>
                             <button class="delete-button" data-index="${resultItem.dataset.id}">Delete</button>`;
  } else {
    // If there is no item, it was canceled.
    resultItem.remove();
  }
}

// --- Restore Original ---

function restoreOriginal(resultItem, item) {
  if (confirm("Discard all edits and revert to original values?")) {
    // Update allData values
    const index = allData.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      allData[index].value = item.originalValue;
      allData[index].sheet = item.originalSheet;
      allData[index].month = item.originalMonth;
    }

    // Update the input field values (stay in edit mode)
    resultItem.querySelector(".edit-year").value = item.originalSheet;
    resultItem.querySelector(".edit-month").value = item.originalMonth;
    resultItem.querySelector(".edit-value").value = item.originalValue;

    // Update item
    item.value = item.originalValue;
    item.sheet = item.originalSheet;
    item.month = item.originalMonth;
  }
}

// --- Save Changes (to your server) ---

async function saveChanges(resultItem, item) {
  const year = resultItem.querySelector(".edit-year")?.value;
  const month = resultItem.querySelector(".edit-month")?.value;
  const newValue = resultItem.querySelector(".edit-value")?.value;

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
          credentials: 'include' // Add this line
        }
      );

      if (!response.ok) {
        // Try to parse the error response as JSON
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse error response as JSON:", jsonError);
        }

        // Check if the error response contains a 'message' property
        const errorMessage = errorData.message || "Unknown error"; 

        throw new Error(`Failed to update entry: ${response.status} - ${errorMessage}`);
      }

      // Update allData after successful save
      const index = allData.findIndex((i) => i.id === item.id);
      if (index !== -1) {
        allData[index] = { id: item.id, ...updatedItem };
      }

      // Update the display after successful save
      resultItem.querySelector(".result-year").innerHTML = updatedItem.sheet;
      resultItem.querySelector(".result-month").innerHTML = updatedItem.month;
      resultItem.querySelector(".result-value").innerHTML = updatedItem.value;

      // Update item
      item.value = newValue;
      item.sheet = year;
      item.month = month;

      // Update the buttons after saving
      const buttonsDiv = resultItem.querySelector(".result-buttons");
      buttonsDiv.innerHTML = `<button class="edit-button" data-index="${item.id}">Edit</button>
                               <button class="delete-button" data-index="${item.id}">Delete</button>`;
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to save changes. See console for details.");
    }
  } else {
    // New entry: Create
    // ... (rest of your code for creating a new entry)
  }
}

// --- Create New Entry UI ---

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

  resultsContainer.prepend(resultItem); // Add to the beginning of the results

  // Add event listeners to the buttons
  const saveButton = resultItem.querySelector(".save-button");
  const cancelButton = resultItem.querySelector(".cancel-button");

  saveButton.addEventListener("click", () => saveChanges(resultItem, null)); // Pass null for item
  cancelButton.addEventListener("click", () => cancelChanges(resultItem, null)); // Pass null for item
}

// --- Delete Entry ---

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
        const errorData = await response.json();
        throw new Error(
          `Failed to delete entry: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      // Remove the item from allData
      allData = allData.filter((i) => i.id !== item.id);

      // Remove the item from the DOM
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

  // Add event listener for the "New Entry" button
  const newEntryButton = document.getElementById("new-entry-button");
  newEntryButton.addEventListener("click", createNewEntryUI);
});