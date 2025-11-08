// ink-formula-tool.js (Step 3: Add Search Functionality)

// Global array to store basic formula info
let allInkData = [];

const formulaListContainer = document.getElementById("formula-list");
const addFormulaButton = document.getElementById("add-formula-button");
const searchInput = document.getElementById("formula-search-input"); // Get search input

// --- Renders the current list of formula inputs, filtering if needed ---
// MODIFIED: Now displays nothing if searchTerm is empty.
function displayFormulas(searchTerm = "") {
  if (!formulaListContainer) return;
  formulaListContainer.innerHTML = ""; // Clear existing entries

  let filteredData = []; // Start with an empty array

  // --- MODIFICATION START ---
  // Only filter and assign data if there IS a search term
  if (searchTerm) {
    filteredData = allInkData.filter(
      (item) => item.inkColor?.toLowerCase().includes(searchTerm) // Check inkColor safely
    );
  }
  // --- MODIFICATION END ---

  // Now, filteredData is either empty (if searchTerm was empty)
  // or contains the filtered results (if searchTerm had text).

  if (filteredData.length === 0) {
    if (searchTerm) {
      // Message when search yields no results
      formulaListContainer.innerHTML = `<p>No formulas found matching "${searchTerm}".</p>`;
    } else {
      // Message when search bar is empty
      formulaListContainer.innerHTML =
        "<p>Type in the search bar to find formulas.</p>";
    }
    return; // Stop here if no data to display
  }

  // Iterate over FILTERED data (which is non-empty if we reach here)
  filteredData.forEach((item) => {
    const formulaRow = document.createElement("div");
    formulaRow.className = "result-item";
    formulaRow.dataset.id = item.id;

    formulaRow.innerHTML = `
            <div class="result-column formula-color-input">
                <label for="inkColor-${item.id}">Ink Color:</label>
                <input
                    type="text"
                    id="inkColor-${item.id}"
                    class="ink-color-field"
                    value="${item.inkColor || ""}"
                    placeholder="Enter Pantone # or Color Name"
                    data-id="${item.id}"
                 >
            </div>
            <div class="result-column formula-actions">
                 <button class="save-formula-button" data-id="${
                   item.id
                 }">Save</button>
                 <button class="delete-formula-button" data-id="${
                   item.id
                 }">Delete</button>
            </div>
        `;

    // Add listener for save button
    const saveButton = formulaRow.querySelector(".save-formula-button");
    if (saveButton) {
      saveButton.addEventListener("click", handleSave);
    }
    // Add listener for delete button
    const deleteButton = formulaRow.querySelector(".delete-formula-button");
    if (deleteButton) {
      deleteButton.addEventListener("click", handleDelete);
    }

    formulaListContainer.appendChild(formulaRow);
  });
}

// --- Handles saving the current value from the input field ---
function handleSave(event) {
  const button = event.target;
  const itemId = button.dataset.id;

  // Find the parent row element to get the input field within it
  const formulaRow = button.closest(".result-item");
  if (!formulaRow) return;

  const inputField = formulaRow.querySelector(".ink-color-field");
  if (!inputField) return;

  const newValue = inputField.value.trim();

  // Basic validation - don't save if empty
  if (!newValue) {
    alert("Ink Color cannot be empty.");
    inputField.focus(); // Focus the input field again
    return;
  }

  // Find the item in our data array and update it
  const itemIndex = allInkData.findIndex((item) => item.id == itemId);
  if (itemIndex !== -1) {
    allInkData[itemIndex].inkColor = newValue;
    console.log("Saved Data:", allInkData); // For debugging

    // --- Modification Start ---
    // 1. Get reference to the search input
    const searchInput = document.getElementById("formula-search-input");

    // 2. Clear the search input field
    if (searchInput) {
      searchInput.value = "";
    }

    // 3. Re-render the list. Since search is now empty,
    //    the just-saved item won't be displayed unless searched for again.
    displayFormulas();
    // --- Modification End ---

    // Note: The row disappearing is the feedback, so the temporary
    // "Saved!" text on the button is less necessary now, but can be kept if desired.
    // button.textContent = 'Saved!';
    // setTimeout(() => { button.textContent = 'Save'; }, 1500);
  } else {
    console.error("Could not find item to save with ID:", itemId);
    alert("Error: Could not find item to save."); // User feedback
  }
}

// --- Handles deleting a formula row ---
function handleDelete(event) {
  const button = event.target;
  const itemId = button.dataset.id;
  const itemToDelete = allInkData.find((item) => item.id == itemId);
  const confirmMessage = itemToDelete?.inkColor
    ? `Are you sure you want to delete "${itemToDelete.inkColor}"?`
    : "Are you sure you want to delete this empty formula?";

  if (confirm(confirmMessage)) {
    allInkData = allInkData.filter((item) => item.id != itemId);
    // Re-render the list with the current search term preserved
    displayFormulas(searchInput?.value.toLowerCase().trim() || "");
  }
}

// --- Adds a new, empty formula entry ---
// MODIFIED: Directly appends the new row instead of re-rendering the whole list.
function addFormula() {
    // Remove the "No formulas added yet" message if it exists
    const noFormulasMsg = formulaListContainer.querySelector('p');
    if (noFormulasMsg && noFormulasMsg.textContent.includes("No formulas")) {
        noFormulasMsg.remove();
    }

    // Create the new data item
    const newItem = {
        id: Date.now(), // Simple unique ID using timestamp
        inkColor: ""
    };
    allInkData.push(newItem); // Add to our data array

    // --- Create the HTML for the new row ---
    const formulaRow = document.createElement("div");
    formulaRow.className = "result-item"; // Apply styling
    formulaRow.dataset.id = newItem.id;  // Set the ID

    formulaRow.innerHTML = `
        <div class="result-column formula-color-input">
            <label for="inkColor-${newItem.id}">Ink Color:</label>
            <input
                type="text"
                id="inkColor-${newItem.id}"
                class="ink-color-field"
                value="${newItem.inkColor || ''}"
                placeholder="Enter Pantone # or Color Name"
                data-id="${newItem.id}"
             >
        </div>
        <div class="result-column formula-actions">
             <button class="save-formula-button" data-id="${newItem.id}">Save</button>
             <button class="delete-formula-button" data-id="${newItem.id}">Delete</button>
        </div>
    `;

    // --- Add listeners to the new row's buttons ---
    const saveButton = formulaRow.querySelector('.save-formula-button');
    if (saveButton) {
        saveButton.addEventListener('click', handleSave);
    }
    const deleteButton = formulaRow.querySelector('.delete-formula-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', handleDelete);
    }

    // --- Append the new row to the container ---
    formulaListContainer.appendChild(formulaRow); // Add the new row to the end

    // Optional: focus the new input field
    const newInput = formulaRow.querySelector('.ink-color-field');
    newInput?.focus();

    console.log("Added new formula row, Data:", allInkData); // For debugging
}

// --- Handles search input changes ---
function handleSearchInput() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  displayFormulas(searchTerm); // Call displayFormulas with the current search term
}

// --- Initial Setup ---
document.addEventListener("DOMContentLoaded", () => {
  // Attach button listener
  if (addFormulaButton) {
    addFormulaButton.addEventListener("click", addFormula);
  } else {
    console.error("Add Formula button not found!");
  }

  // Attach search listener
  if (searchInput) {
    searchInput.addEventListener("input", handleSearchInput); // Trigger filtering on input
  } else {
    console.error("Search input not found!");
  }

  // Initial display
  displayFormulas();
});
