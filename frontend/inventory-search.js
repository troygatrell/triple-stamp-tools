let allData = []; // Global variable to store the data
let hidePulledSamples = false;
let currentSearchTerm = "";

function normalizeId(id) {
  if (!id) {
    return "";
  }
  if (typeof id === "string") {
    return id;
  }
  if (typeof id === "object" && "$oid" in id) {
    return id.$oid;
  }
  return String(id);
}

// --- Data Loading (from your server) ---

async function loadData() {
  try {
    // Hide the search input box
    document.getElementById("search-input").style.display = "none";

    const response = await fetch(
      "https://inventory-search.onrender.com/api/inventory"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory: ${response.status}`);
    }

    const rawData = await response.json();

    // Add the _id from MongoDB to each item as a property called 'id'
    allData = rawData.map((item) => {
      const { _id, ...rest } = item;
      return { id: normalizeId(_id), ...rest };
    });

    allData = sortData(allData); // Sort the data initially

    setupSearch();

    updateDisplayedResults();

    console.log("Data loaded from server");
  } catch (error) {
    console.error("Error loading data:", error);
  } finally {
    // Hide the loading indicator in the `finally` block to ensure it's always hidden, even if an error occurs
    document.getElementById("loading-indicator").style.display = "none";

    // Show the search input box again
    document.getElementById("search-input").style.display = "block";
  }
}

// --- Helper Functions ---

function getHeldItems() {
  return allData.filter((item) => item.hold === true);
}

function computeDisplayedResults() {
  const searchTerm = currentSearchTerm;

  if (!searchTerm) {
    if (hidePulledSamples) {
      return [];
    }
    return getHeldItems();
  }

  const heldItems = hidePulledSamples
    ? []
    : allData.filter((item) => item.hold === true);

  const matchingItems = allData.filter(
    (item) =>
      item.hold !== true &&
      typeof item.value === "string" &&
      item.value.toLowerCase().includes(searchTerm)
  );

  return hidePulledSamples ? matchingItems : [...heldItems, ...matchingItems];
}

function updateDisplayedResults() {
  const results = computeDisplayedResults();
  displayResults(results);
}

// --- Search Setup ---

function setupSearch() {
  const searchInput = document.getElementById("search-input");

  if (!searchInput) {
    return;
  }

  currentSearchTerm = searchInput.value.trim().toLowerCase();

  searchInput.addEventListener("input", () => {
    currentSearchTerm = searchInput.value.trim().toLowerCase();
    updateDisplayedResults();
  });
}

// --- Display Results & Editing ---

function displayResults(results = allData) {
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

    const holdButtonText = item.hold ? "Drop" : "Hold";
    const holdButtonClass = item.hold ? "hold-button active-hold" : "hold-button";

    resultItem.innerHTML = `
            ${yearColumn}
            <div class="result-column result-month">${item.month}</div>
            <div class="result-column result-value">${item.value}</div>
            <div class="result-column result-buttons">
                <button class="edit-button" data-index="${item.id}">Edit</button>
                <button class="delete-button" data-index="${item.id}">Delete</button>
                <button class="${holdButtonClass}" data-index="${item.id}">${holdButtonText}</button>
            </div>
        `;

    resultsContainer.appendChild(resultItem);
  });
}

// --- Event Delegation Setup ---

function setupEditButtonDelegation() {
  const resultsContainer = document.getElementById("search-results");

  resultsContainer.addEventListener("click", (event) => {
    // Check if the clicked element is either an edit, delete, or hold button
    if (
      event.target.classList.contains("edit-button") ||
      event.target.classList.contains("delete-button") ||
      event.target.classList.contains("hold-button")
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
          } else if (event.target.classList.contains("hold-button")) {
            toggleHold(resultItem, item);
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
    // 0. Prioritize held items first
    const aHold = a.hold === true;
    const bHold = b.hold === true;

    if (aHold && !bHold) {
      return -1; // a (held) goes first
    } else if (!aHold && bHold) {
      return 1; // b (held) goes first
    }

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
    // Ensure month values are valid before comparing
    const monthA = monthOrder[a.month];
    const monthB = monthOrder[b.month];

    if (monthA === undefined && monthB === undefined) {
      return 0; // Both are invalid, so keep original order
    } else if (monthA === undefined) {
      return 1; // a is invalid, so goes to the bottom
    } else if (monthB === undefined) {
      return -1; // b is invalid, so goes to the bottom
    }

    return monthB - monthA;
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
  yearDiv.innerHTML = `
        <select class="edit-year">
            <option value="2023" ${
              item.sheet === "2023" ? "selected" : ""
            }>2023</option>
            <option value="2024" ${
              item.sheet === "2024" ? "selected" : ""
            }>2024</option>
            <option value="2025" ${item.sheet === "2025" ? "selected" : ""}>2025</option>
        </select>
    `;
  monthDiv.innerHTML = `
    <select class="edit-month">
        <option value="January" ${
          item.month === "January" ? "selected" : ""
        }>January</option>
        <option value="February" ${
          item.month === "February" ? "selected" : ""
        }>February</option>
        <option value="March" ${item.month === "March" ? "selected" : ""}>March</option>
        <option value="April" ${
          item.month === "April" ? "selected" : ""
        }>April</option>
        <option value="May" ${
          item.month === "May" ? "selected" : ""
        }>May</option>
        <option value="June" ${
          item.month === "June" ? "selected" : ""
        }>June</option>
        <option value="July" ${
          item.month === "July" ? "selected" : ""
        }>July</option>
        <option value="August" ${
          item.month === "August" ? "selected" : ""
        }>August</option>
        <option value="September" ${
          item.month === "September" ? "selected" : ""
        }>September</option>
        <option value="October" ${
          item.month === "October" ? "selected" : ""
        }>October</option>
        <option value="November" ${
          item.month === "November" ? "selected" : ""
        }>November</option>
        <option value="December" ${
          item.month === "December" ? "selected" : ""
        }>December</option>
    </select>
`;
  valueDiv.innerHTML = `<input type="text" class="edit-value" value="${item.value}">`;

  buttonsDiv.innerHTML = `
        <button class="save-button">Save</button>
        <button class="cancel-button">Cancel</button>
        <button class="delete-button">Delete</button>
    `;

  // Add event listeners to the buttons
  const saveButton = buttonsDiv.querySelector(".save-button");
  const cancelButton = buttonsDiv.querySelector(".cancel-button");
  const deleteButton = buttonsDiv.querySelector(".delete-button");

  saveButton.addEventListener("click", () => saveChanges(resultItem, item));
  cancelButton.addEventListener("click", () => cancelChanges(resultItem, item));
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

    // Switch back to the Edit, Delete, and Hold buttons
    const holdButtonText = item.hold ? "Drop" : "Hold";
    const holdButtonClass = item.hold ? "hold-button active-hold" : "hold-button";
    buttonsDiv.innerHTML = `<button class="edit-button" data-index="${resultItem.dataset.id}">Edit</button>
                             <button class="delete-button" data-index="${resultItem.dataset.id}">Delete</button>
                             <button class="${holdButtonClass}" data-index="${resultItem.dataset.id}">${holdButtonText}</button>`;
  } else {
    // If there is no item, it was canceled.
    resultItem.remove();
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
          credentials: "include", // Add this line
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

        throw new Error(
          `Failed to update entry: ${response.status} - ${errorMessage}`
        );
      }

      // Update allData after successful save
      const index = allData.findIndex((i) => i.id === item.id);
      if (index !== -1) {
        allData[index] = { ...allData[index], ...updatedItem };
      }

      // Update the display after successful save
      resultItem.querySelector(".result-year").innerHTML = updatedItem.sheet;
      resultItem.querySelector(".result-month").innerHTML = updatedItem.month;
      resultItem.querySelector(".result-value").innerHTML = updatedItem.value;

      // Update item
      Object.assign(item, {
        value: newValue,
        sheet: year,
        month,
      });

      // Update the buttons after saving
      const buttonsDiv = resultItem.querySelector(".result-buttons");
      const holdButtonText = item.hold ? "Drop" : "Hold";
      const holdButtonClass = item.hold ? "hold-button active-hold" : "hold-button";
      buttonsDiv.innerHTML = `<button class="edit-button" data-index="${item.id}">Edit</button>
                               <button class="delete-button" data-index="${item.id}">Delete</button>
                               <button class="${holdButtonClass}" data-index="${item.id}">${holdButtonText}</button>`;
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to save changes. See console for details.");
    }
  } else {
    // New entry: Create
    const newItem = {
      sheet: year,
      month: month,
      value: newValue,
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
        const errorData = await response.json(); // Try to parse error response
        throw new Error(
          `Failed to create new entry: ${response.status} - ${
            errorData.message || "Unknown error"
          }`
        );
      }

      const { _id, ...rest } = await response.json();
      const normalizedId = normalizeId(_id);
      const savedItem = {
        id: normalizedId,
        ...rest,
        originalValue: rest.value,
        originalSheet: rest.sheet,
        originalMonth: rest.month,
      };

      // Add the newly created item to allData
      allData.push(savedItem);

      // Update the display with the saved item's data and ID
      resultItem.dataset.id = savedItem.id; // Set the data-id attribute
      resultItem.querySelector(".result-year").innerHTML = savedItem.sheet;
      resultItem.querySelector(".result-month").innerHTML = savedItem.month;
      resultItem.querySelector(".result-value").innerHTML = savedItem.value;

      location.reload();

      // Update the data-original-* attributes
      resultItem.dataset.originalValue = savedItem.value;
      resultItem.dataset.originalSheet = savedItem.sheet;
      resultItem.dataset.originalMonth = savedItem.month;

      // Update the buttons after saving
      const buttonsDiv = resultItem.querySelector(".result-buttons");
      buttonsDiv.innerHTML = `<button class="edit-button" data-index="${savedItem.id}">Edit</button>
                                   <button class="delete-button" data-index="${savedItem.id}">Delete</button>`;
    } catch (error) {
      console.error("Error creating new item:", error);
      alert("Failed to create new entry. See console for details.");
    }
  }
}

// --- Create New Entry UI ---

function createNewEntryUI() {
  const resultsContainer = document.getElementById("search-results");
  const resultItem = document.createElement("div");
  resultItem.className = "result-item";

  // Set the data-original attributes
  resultItem.dataset.originalValue = ""; // Or an appropriate default value
  resultItem.dataset.originalSheet = ""; // Or an appropriate default value
  resultItem.dataset.originalMonth = ""; // Or an appropriate default value

  // Create the input fields directly, with placeholders. NO data-id yet.
  resultItem.innerHTML = `
        <div class="result-column result-year">
            <select class="edit-year">
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
        </div>
        <div class="result-column result-month">
            <select class="edit-month">
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
            </select>
        </div>
        <div class="result-column result-value"><input type="text" class="edit-value" placeholder="Job Name"></div>
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

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentMonth = monthNames[currentDate.getMonth()];

  const yearSelect = resultItem.querySelector(".edit-year");
  if (
    yearSelect &&
    !Array.from(yearSelect.options).some((option) => option.value === currentYear)
  ) {
    const newYearOption = document.createElement("option");
    newYearOption.value = currentYear;
    newYearOption.textContent = currentYear;
    yearSelect.prepend(newYearOption);
  }
  if (yearSelect) {
    yearSelect.value = currentYear;
  }

  const monthSelect = resultItem.querySelector(".edit-month");
  if (monthSelect) {
    monthSelect.value = currentMonth;
  }
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

// --- Toggle Hold ---

async function toggleHold(resultItem, item) {
  try {
    // Toggle the hold value
    const newHoldValue = !item.hold;

    // Update the item in the database
    const updatedItem = {
      sheet: item.sheet,
      month: item.month,
      value: item.value,
      originalValue: item.originalValue,
      originalSheet: item.originalSheet,
      originalMonth: item.originalMonth,
      hold: newHoldValue,
    };

    const response = await fetch(
      `https://inventory-search.onrender.com/api/inventory/${item.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update hold status: ${response.status}`);
    }

    // Reload the page to refresh the results with the new hold status
    location.reload();
  } catch (error) {
    console.error("Error toggling hold status:", error);
    alert("Failed to toggle hold status. See console for details.");
  }
}

// --- Initial Load ---

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupEditButtonDelegation();

  // Add event listener for the "New Entry" button
  const newEntryButton = document.getElementById("new-entry-button");
  if (newEntryButton) {
    newEntryButton.addEventListener("click", createNewEntryUI);
  }

  const togglePulledButton = document.getElementById("toggle-pulled-button");
  if (togglePulledButton) {
    togglePulledButton.addEventListener("click", () => {
      hidePulledSamples = !hidePulledSamples;
      togglePulledButton.textContent = hidePulledSamples
        ? "Show Pulled Samples"
        : "Hide Pulled Samples";
      updateDisplayedResults();
    });
  }
});
