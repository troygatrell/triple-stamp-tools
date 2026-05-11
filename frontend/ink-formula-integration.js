// frontend/ink-formula-integration.js

// --- Configuration for Mock API ---
let USE_MOCK_API = false; // Set to true to use mock data, false for actual API
const MOCK_API_DELAY = 300; // Simulate network latency in milliseconds

let inMemoryDB = []; // This will act as our local "database" when USE_MOCK_API is true
let nextMockId = 1;

// --- Mock API Functions ---
function _getFormulasMock() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: () => Promise.resolve(JSON.parse(JSON.stringify(inMemoryDB))) // Deep copy to prevent direct mutation
      });
    }, MOCK_API_DELAY);
  });
}

function _postFormulaMock(formulaData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newFormula = {
        _id: `mock-${nextMockId++}`,
        ...formulaData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      inMemoryDB.push(newFormula);
      resolve({
        ok: true,
        json: () => Promise.resolve(JSON.parse(JSON.stringify(newFormula)))
      });
    }, MOCK_API_DELAY);
  });
}

function _putFormulaMock(id, formulaData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = inMemoryDB.findIndex(f => f._id === id);
      if (index !== -1) {
        const updatedFormula = {
          ...inMemoryDB[index],
          ...formulaData,
          _id: id, // Ensure ID is preserved
          updatedAt: new Date().toISOString()
        };
        inMemoryDB[index] = updatedFormula;
        resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Mock update successful" })
        });
      } else {
        resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: "Mock formula not found" })
        });
      }
    }, MOCK_API_DELAY);
  });
}

function _deleteFormulaMock(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const initialLength = inMemoryDB.length;
      inMemoryDB = inMemoryDB.filter(f => f._id !== id);
      if (inMemoryDB.length < initialLength) {
        resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Mock delete successful" })
        });
      } else {
        resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: "Mock formula not found" })
        });
      }
    }, MOCK_API_DELAY);
  });
}

// --- Original Integration Logic (modified for mock API) ---

let inkFormulaFormatterInstance;
let allSavedFormulas = [];
let currentSearchTerm = "";
let currentEditingFormulaId = null; // null for new formula, ID for existing

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

// --- Formula Management ---

async function loadSavedFormulas() {
  try {
    let response;
    if (USE_MOCK_API) {
      response = await _getFormulasMock();
    } else {
      response = await fetch("/api/inkformulas");
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ink formulas: ${response.status}`);
    }
    const rawData = await response.json();
    allSavedFormulas = rawData.map((item) => {
      const idKey = USE_MOCK_API ? '_id' : '_id'; // Mock uses _id, Mongo also uses _id
      const { [idKey]: id, ...rest } = item;
      return { id: normalizeId(id), ...rest };
    });
    allSavedFormulas.sort((a, b) => (a.formulaName || "").localeCompare(b.formulaName || ""));
    updateSavedFormulaResults();
    console.log("Saved ink formulas loaded.");
  } catch (error) {
    console.error("Error loading saved ink formulas:", error);
    document.getElementById("saved-formula-results").innerHTML = "<p>Failed to load saved formulas.</p>";
  }
}

function updateSavedFormulaResults() {
  const resultsContainer = document.getElementById("saved-formula-results");
  resultsContainer.innerHTML = "";

  const filteredFormulas = allSavedFormulas.filter(formula =>
    (formula.formulaName || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
    (formula.displayText || "").toLowerCase().includes(currentSearchTerm.toLowerCase())
  );

  if (filteredFormulas.length === 0) {
    resultsContainer.innerHTML = "<p>No formulas found.</p>";
    return;
  }

  filteredFormulas.forEach(formula => {
    const formulaItem = document.createElement("div");
    formulaItem.className = "saved-formula-item";
    formulaItem.dataset.id = formula.id;

    // Display a summary
    let summary = formula.formulaName || "Untitled Formula";
    if (formula.jobName) summary += ` - ${formula.jobName}`;
    if (formula.date) summary += ` (${formula.date})`;

    formulaItem.innerHTML = `
      <div class="formula-details">
        <strong>${summary}</strong>
        <p>${(formula.displayText || '').split('
')[0]}</p>
      </div>
      <div class="formula-actions">
        <button class="load-formula-button" data-id="${formula.id}">Load</button>
        <button class="delete-formula-button" data-id="${formula.id}">Delete</button>
      </div>
    `;
    resultsContainer.appendChild(formulaItem);
  });
}

// --- Formatter Interaction ---

function handleFormatterChange() {
  const saveButton = document.getElementById("save-current-formula-button");
  if (saveButton && inkFormulaFormatterInstance) {
    saveButton.disabled = !inkFormulaFormatterInstance.isValid();
  }
}

function loadFormulaIntoFormatter(formulaId) {
  const formula = allSavedFormulas.find(f => f.id === formulaId);
  if (formula && inkFormulaFormatterInstance) {
    inkFormulaFormatterInstance.setData(formula);
    currentEditingFormulaId = formula.id;
    handleFormatterChange();
  }
}

function clearFormatter() {
  if (inkFormulaFormatterInstance) {
    inkFormulaFormatterInstance.reset();
    currentEditingFormulaId = null;
    handleFormatterChange();
  }
}

async function saveCurrentFormula() {
  if (!inkFormulaFormatterInstance || !inkFormulaFormatterInstance.isValid()) {
    alert("Please fill in all required fields in the formula editor.");
    return;
  }

  const formulaData = inkFormulaFormatterInstance.getData();

  try {
    let response;
    let url = "/api/inkformulas";
    let method = "POST";

    if (currentEditingFormulaId) {
      url = `/api/inkformulas/${currentEditingFormulaId}`;
      method = "PUT";
    }

    if (USE_MOCK_API) {
      if (method === "POST") {
        response = await _postFormulaMock(formulaData);
      } else { // PUT
        response = await _putFormulaMock(currentEditingFormulaId, formulaData);
      }
    } else {
      response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formulaData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to ${currentEditingFormulaId ? "update" : "create"} ink formula: ${
          response.status
        } - ${errorData.error || "Unknown error"}`
      );
    }

    alert("Formula saved successfully!");
    loadSavedFormulas(); // Refresh the list of saved formulas
    clearFormatter(); // Clear the formatter for a new entry
  } catch (error) {
    console.error("Error saving formula:", error);
    alert(`Failed to save formula: ${error.message}`);
  }
}

async function deleteFormula(formulaId) {
  if (!confirm("Are you sure you want to delete this ink formula?")) {
    return;
  }

  try {
    let response;
    if (USE_MOCK_API) {
      response = await _deleteFormulaMock(formulaId);
    } else {
      response = await fetch(`/api/inkformulas/${formulaId}`, {
        method: "DELETE",
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to delete ink formula: ${response.status} - ${
          errorData.error || "Unknown error"
        }`
      );
    }

    alert("Formula deleted successfully!");
    if (currentEditingFormulaId === formulaId) {
      clearFormatter(); // If deleted formula was open in editor, clear it
    }
    loadSavedFormulas(); // Refresh the list
  } catch (error) {
    console.error("Error deleting formula:", error);
    alert(`Failed to delete formula: ${error.message}`);
  }
}

// --- Event Listeners ---

// Use jQuery's ready function to ensure jQuery is fully loaded and DOM is ready
jQuery(function($) { // Pass $ to ensure it's jQuery's $ within this scope
  console.log("ink-formula-integration.js: jQuery ready and DOMContentLoaded fired.");

  // Initialize the formatter
  const formatterContainer = document.getElementById("formatter-ui-container");
  inkFormulaFormatterInstance = new InkFormulaFormatter(formatterContainer, {
    onChange: handleFormatterChange
  });

  // Explicitly call reset after the formatter instance is fully created and its HTML injected
  inkFormulaFormatterInstance.reset(); // This will also call handleFormatterChange internally.

  // Load saved formulas on startup
  loadSavedFormulas();

  // Search input for saved formulas
  const searchInput = document.getElementById("saved-formula-search-input");
  const clearSearchButton = document.getElementById("saved-formula-clear-search-button");

  searchInput.addEventListener("input", () => {
    currentSearchTerm = searchInput.value.trim();
    updateSavedFormulaResults();
    if (clearSearchButton) {
      clearSearchButton.style.display = searchInput.value ? "block" : "none";
    }
  });

  if (clearSearchButton) {
    clearSearchButton.addEventListener("click", () => {
      searchInput.value = "";
      currentSearchTerm = "";
      clearSearchButton.style.display = "none";
      updateSavedFormulaResults();
    });
  }

  // Refresh button
  document.getElementById("refresh-saved-formulas-button").addEventListener("click", loadSavedFormulas);

  // New Formula button
  document.getElementById("new-formula-button").addEventListener("click", clearFormatter);

  // Save Current Formula button
  document.getElementById("save-current-formula-button").addEventListener("click", saveCurrentFormula);

  // Event delegation for load and delete buttons in saved results
  document.getElementById("saved-formula-results").addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("load-formula-button")) {
      loadFormulaIntoFormatter(target.dataset.id);
    } else if (target.classList.contains("delete-formula-button")) {
      deleteFormula(target.dataset.id);
    }
  });

  // Initial state for mock API checkbox
  // The event listener for 'change' is in test.html inline script,
  // but we need to set the initial USE_MOCK_API flag here based on checkbox state.
  const mockApiCheckbox = document.getElementById('toggle-mock-api');
  if (mockApiCheckbox) {
      USE_MOCK_API = mockApiCheckbox.checked; // Set the global flag based on initial checkbox state
      console.log(`Initial Mock API state: ${USE_MOCK_API ? 'enabled' : 'disabled'}`);
      // If mock API is initially enabled, clear in-memory DB and reload
      if (USE_MOCK_API) {
          inMemoryDB = [];
          nextMockId = 1;
          loadSavedFormulas();
      }
  }
});

// Expose USE_MOCK_API toggle for easy debugging in console
window.toggleMockApi = (enable) => {
  USE_MOCK_API = enable;
  console.log(`Mock API ${USE_MOCK_API ? 'enabled' : 'disabled'}. Reloading formulas...`);
  inMemoryDB = []; // Clear in-memory DB when toggling
  nextMockId = 1;
  loadSavedFormulas();
};