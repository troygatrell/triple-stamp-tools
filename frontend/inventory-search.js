const INVENTORY_API_URL = (typeof API_CONFIG !== "undefined" && API_CONFIG.INVENTORY_API)
  ? API_CONFIG.INVENTORY_API
  : "https://inventory-search.onrender.com/api/inventory";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let allData = []; // Global variable to store the data
let hidePulledSamples = false;
let currentSearchTerm = "";
let currentFilterYear = "all"; // Default to show all years
let currentFilterMonth = "all"; // Default to show all months
let showAllDatabaseItems = false; // New global variable

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

    let rawData = [];
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseClient
          .from("inventory")
          .select("*")
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          rawData = rawData.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            from += pageSize;
          }
        } else {
          hasMore = false;
        }
      }
    } else {
      const response = await fetch(INVENTORY_API_URL);

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.status}`);
      }

      rawData = await response.json();
    }

    // Map each item to have a standardized string 'id'
    allData = rawData.map((item) => {
      const id = item.id !== undefined ? String(item.id) : normalizeId(item._id);
      return {
        ...item,
        id,
        originalValue: item.originalValue || item.value,
        originalSheet: item.originalSheet || item.sheet,
        originalMonth: item.originalMonth || item.month,
      };
    });

    allData = sortData(allData); // Sort the data initially

    setupSearch();

    updateDisplayedResults();

    console.log("Data loaded successfully:", allData.length, "items");
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
  const searchTerm = currentSearchTerm.toLowerCase();
  let intermediateItems = allData; // Start with all data

  // --- Step 1: Determine the base set of items based on ShowAll/SearchTerm/HidePulled ---
  if (!showAllDatabaseItems) {
    // If "Show All" is NOT active, then apply the original search/hidePulled logic
    if (!searchTerm) {
      // Scenario: No search query AND "Show All" is NOT active
      if (hidePulledSamples) {
        // If no search term AND hiding pulled samples, show nothing
        intermediateItems = [];
      } else {
        // If no search term AND NOT hiding pulled samples, show ALL held items
        intermediateItems = allData.filter(item => item.hold === true);
      }
    } else {
      // Scenario: There IS a search query AND "Show All" is NOT active
      intermediateItems = allData.filter(item =>
        typeof item.value === "string" && item.value.toLowerCase().includes(searchTerm)
      );

      if (hidePulledSamples) {
        // If hiding pulled samples, filter out held items from the search-matched results
        intermediateItems = intermediateItems.filter(item => item.hold !== true);
      }
    }
  } else {
    // If "Show All" IS active, start with allData.
    // Then, if there's a search term, apply it.
    if (searchTerm) {
      intermediateItems = intermediateItems.filter(item =>
        typeof item.value === "string" && item.value.toLowerCase().includes(searchTerm)
      );
    }

    // After applying search term (if any), then apply hidePulledSamples if active
    if (hidePulledSamples) {
      intermediateItems = intermediateItems.filter(item => item.hold !== true);
    }
  }


  // --- Step 2: Apply Year Filter ---
  if (currentFilterYear !== "all") {
    intermediateItems = intermediateItems.filter(item => item.sheet === currentFilterYear);
  }

  // --- Step 3: Apply Month Filter ---
  if (currentFilterMonth !== "all") {
    intermediateItems = intermediateItems.filter(item => item.month === currentFilterMonth);
  }

  return intermediateItems;
}

function updateDisplayedResults() {
  const results = computeDisplayedResults();
  displayResults(results);
}

// --- Filter Dropdown Population ---
function populateFilterYearDropdown() {
  const filterYearDropdown = document.getElementById("filter-year");
  if (!filterYearDropdown) return;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const startYear = 2019; // Starting year for the dropdown
  const endYear = currentYear + 1; // Include one year into the future

  let yearOptions = '<option value="all">All Years</option>';
  for (let year = endYear; year >= startYear; year--) {
    yearOptions += `<option value="${year}">${year}</option>`;
  }
  filterYearDropdown.innerHTML = yearOptions;
}

function populateFilterMonthDropdown() {
  const filterMonthDropdown = document.getElementById("filter-month");
  if (!filterMonthDropdown) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  let monthOptions = '<option value="all">All Months</option>';
  monthNames.forEach((month) => {
    monthOptions += `<option value="${month}">${month}</option>`;
  });
  filterMonthDropdown.innerHTML = monthOptions;
}

// --- Search Setup ---

function setupSearch() {
  const searchInput = document.getElementById("search-input");
  const clearSearchButton = document.getElementById("clear-search-button");

  if (!searchInput) {
    return;
  }

  currentSearchTerm = searchInput.value.trim().toLowerCase();

  // Initial check for clear button visibility
  if (clearSearchButton) {
    clearSearchButton.style.display = searchInput.value ? "block" : "none";
  }

  searchInput.addEventListener("input", () => {
    currentSearchTerm = searchInput.value.trim().toLowerCase();
    updateDisplayedResults();

    // Toggle clear button visibility on input
    if (clearSearchButton) {
      clearSearchButton.style.display = searchInput.value ? "block" : "none";
    }
  });

  if (clearSearchButton) {
    clearSearchButton.addEventListener("click", () => {
      searchInput.value = ""; // Clear the input field
      currentSearchTerm = ""; // Clear the search term
      clearSearchButton.style.display = "none"; // Hide the clear button
      updateDisplayedResults(); // Refresh results
    });
  }
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
      yearColumn = `<div class="result-column result-year">${escapeHtml(item.sheet)}</div>`;
      lastYear = item.sheet;
    } else {
      yearColumn = `<div class="result-column result-year"></div>`;
    }

    const holdButtonText = item.hold ? "Return" : "Hold";
    const holdButtonClass = item.hold ? "hold-button active-hold" : "hold-button";

    resultItem.innerHTML = `
            ${yearColumn}
            <div class="result-column result-month">${escapeHtml(item.month)}</div>
            <div class="result-column result-value">${escapeHtml(item.value)}</div>
            <div class="result-column result-buttons">
                <button class="edit-button" data-index="${escapeHtml(item.id)}">Edit</button>
                <button class="delete-button" data-index="${escapeHtml(item.id)}">Delete</button>
                <button class="${holdButtonClass}" data-index="${escapeHtml(item.id)}">${holdButtonText}</button>
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

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const startYear = 2019;
  const endYear = currentYear + 1;
  const currentItemYear = String(item.sheet || "");
  const yearList = [];
  for (let yr = endYear; yr >= startYear; yr--) {
    yearList.push(String(yr));
  }
  if (currentItemYear && !yearList.includes(currentItemYear)) {
    yearList.unshift(currentItemYear);
  }

  let yearOptions = "";
  yearList.forEach((yr) => {
    yearOptions += `<option value="${escapeHtml(yr)}" ${
      currentItemYear === yr ? "selected" : ""
    }>${escapeHtml(yr)}</option>`;
  });

  // Replace content with input fields
  yearDiv.innerHTML = `
        <select class="edit-year">
          ${yearOptions}
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
  valueDiv.innerHTML = `<input type="text" class="edit-value" value="${escapeHtml(item.value)}">`;

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
    yearDiv.textContent = item.sheet;
    monthDiv.textContent = item.month;
    valueDiv.textContent = item.value;

    // Switch back to the Edit, Delete, and Hold buttons
    const holdButtonText = item.hold ? "Return" : "Hold";
    const holdButtonClass = item.hold ? "hold-button active-hold" : "hold-button";
    buttonsDiv.innerHTML = `<button class="edit-button" data-index="${escapeHtml(resultItem.dataset.id)}">Edit</button>
                             <button class="delete-button" data-index="${escapeHtml(resultItem.dataset.id)}">Delete</button>
                             <button class="${holdButtonClass}" data-index="${escapeHtml(resultItem.dataset.id)}">${holdButtonText}</button>`;
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
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        const { error } = await supabaseClient
          .from("inventory")
          .update(updatedItem)
          .eq("id", item.id);

        if (error) throw error;
      } else {
        const response = await fetch(
          `${INVENTORY_API_URL}/${item.id}`,
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
      }

      // Update allData after successful save
      const index = allData.findIndex((i) => i.id === item.id);
      if (index !== -1) {
        allData[index] = { ...allData[index], ...updatedItem };
      }

      // Update item
      Object.assign(item, {
        value: newValue,
        sheet: year,
        month,
      });

      // Resort and update results in place
      allData = sortData(allData);
      updateDisplayedResults();
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
      let savedItem;
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        const { data, error } = await supabaseClient
          .from("inventory")
          .insert([newItem])
          .select()
          .single();

        if (error) throw error;

        savedItem = {
          id: String(data.id),
          ...data,
          originalValue: data.value,
          originalSheet: data.sheet,
          originalMonth: data.month,
        };
      } else {
        const response = await fetch(
          INVENTORY_API_URL,
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
        savedItem = {
          id: normalizedId,
          ...rest,
          originalValue: rest.value,
          originalSheet: rest.sheet,
          originalMonth: rest.month,
        };
      }

      // Add the newly created item to allData and re-sort
      allData.push(savedItem);
      allData = sortData(allData);

      // Remove the draft creation element and update the displayed list
      resultItem.remove();
      updateDisplayedResults();
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

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const startYear = 2019;
  const endYear = currentYear + 1; // Include one year into the future
  let yearOptions = "";
  for (let year = endYear; year >= startYear; year--) {
    yearOptions += `<option value="${year}" ${
      year === currentYear ? "selected" : ""
    }>${year}</option>`;
  }

  // Create the input fields directly, with placeholders. NO data-id yet.
  resultItem.innerHTML = `
        <div class="result-column result-year">
            <select class="edit-year">
              ${yearOptions}
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

  const monthSelect = resultItem.querySelector(".edit-month");
  if (monthSelect) {
    monthSelect.value = currentMonth;
  }
}

// --- Delete Entry ---

async function deleteEntry(resultItem, item) {
  const enteredPassword = prompt("Enter admin password to delete this item:");
  if (enteredPassword === null) return; // User pressed Cancel
  if (!enteredPassword.trim()) {
    alert("Password cannot be empty.");
    return;
  }

  try {
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      const { error } = await supabaseClient.rpc("delete_inventory_item", {
        item_id: Number(item.id),
        admin_password: enteredPassword.trim()
      });

      if (error) {
        alert(error.message || "Failed to delete item: incorrect password.");
        return;
      }
    } else {
      const response = await fetch(
        `${INVENTORY_API_URL}/${item.id}`,
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
    }

    // Remove the item from allData
    allData = allData.filter((i) => i.id !== item.id);

    // Remove the item from the DOM
    resultItem.remove();
  } catch (error) {
    console.error("Error deleting item:", error);
    alert(error.message || "Failed to delete entry. See console for details.");
  }
}

// --- Toggle Hold ---

async function toggleHold(resultItem, item) {
  try {
    // Toggle the hold value
    const newHoldValue = !item.hold;

    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      const { error } = await supabaseClient
        .from("inventory")
        .update({ hold: newHoldValue })
        .eq("id", item.id);

      if (error) throw error;
    } else {
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
        `${INVENTORY_API_URL}/${item.id}`,
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
    }

    // Update item and refresh in-place without page reload
    item.hold = newHoldValue;
    const index = allData.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      allData[index].hold = newHoldValue;
    }
    allData = sortData(allData);
    updateDisplayedResults();
  } catch (error) {
    console.error("Error toggling hold status:", error);
    alert("Failed to toggle hold status. See console for details.");
  }
}

// --- Database Backup ---

async function downloadDatabaseBackup() {
  const backupButton = document.getElementById("backup-database-button");
  const originalText = backupButton ? backupButton.textContent : "Download Backup";

  try {
    if (backupButton) {
      backupButton.disabled = true;
      backupButton.textContent = "Downloading...";
    }

    let data;
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      // Use the latest in-memory data loaded from Supabase
      data = allData;
    } else {
      try {
        const response = await fetch(INVENTORY_API_URL);
        if (response.ok) {
          data = await response.json();
        }
      } catch (fetchError) {
        console.warn("Could not fetch fresh data from server, falling back to loaded data:", fetchError);
      }

      // Fall back to allData in memory if network request failed
      if (!data && allData && allData.length > 0) {
        data = allData;
      }
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      alert("No inventory records found to back up.");
      return;
    }

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const fileName = `sample-inventory-backup-${dateStr}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading database backup:", error);
    alert("Failed to download database backup. See console for details.");
  } finally {
    if (backupButton) {
      backupButton.disabled = false;
      backupButton.textContent = originalText;
    }
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

  // New Filters button and dropdowns logic
  const toggleFiltersButton = document.getElementById("toggle-filters-button");
  const filterDropdownsContainer = document.getElementById(
    "filter-dropdowns-container"
  );
  if (toggleFiltersButton && filterDropdownsContainer) {
    toggleFiltersButton.addEventListener("click", () => {
      const isHidden = filterDropdownsContainer.style.display === "none";
      filterDropdownsContainer.style.display = isHidden ? "flex" : "none";
      toggleFiltersButton.textContent = isHidden ? "Hide Filters" : "Show Filters";
    });
  }

  populateFilterYearDropdown();
  populateFilterMonthDropdown();

  const filterYearDropdown = document.getElementById("filter-year");
  const filterMonthDropdown = document.getElementById("filter-month");

  if (filterYearDropdown) {
    filterYearDropdown.addEventListener("change", () => {
      currentFilterYear = filterYearDropdown.value;
      updateDisplayedResults();
    });
  }

  if (filterMonthDropdown) {
    filterMonthDropdown.addEventListener("change", () => {
      currentFilterMonth = filterMonthDropdown.value;
      updateDisplayedResults();
    });
  }

  const resetFiltersButton = document.getElementById("reset-filters-button");
  if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", () => {
      currentFilterYear = "all";
      currentFilterMonth = "all";

      const filterYearDropdown = document.getElementById("filter-year");
      if (filterYearDropdown) {
        filterYearDropdown.value = "all";
      }
      const filterMonthDropdown = document.getElementById("filter-month");
      if (filterMonthDropdown) {
        filterMonthDropdown.value = "all";
      }

      updateDisplayedResults();
    });
  }

  const showAllButton = document.getElementById("show-all-button");
  if (showAllButton) {
    showAllButton.addEventListener("click", () => {
      showAllDatabaseItems = !showAllDatabaseItems;
      showAllButton.textContent = showAllDatabaseItems ? "Hide All" : "Show All";
      updateDisplayedResults();
    });
  }

  const backupDatabaseButton = document.getElementById("backup-database-button");
  if (backupDatabaseButton) {
    backupDatabaseButton.addEventListener("click", downloadDatabaseBackup);
  }
});
