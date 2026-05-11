// ink-formula-tool.js - Main logic for the Ink Formula Tool

let allFormulas = []; // Global variable to store the data
let currentFormatter = null; // Instance of InkFormulaFormatter
let currentEditedFormulaId = null; // Stores the ID of the formula being edited (null for new)

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

// --- View Management ---
function showListView() {
  document.getElementById("formula-list-view").style.display = "block";
  document.getElementById("ink-formula-editor").style.display = "none";
  updateDisplayedResults(); // Refresh list after potential changes
}

function showEditorView(formulaData = null) {
  document.getElementById("formula-list-view").style.display = "none";
  document.getElementById("ink-formula-editor").style.display = "block";

  const formatterContainer = document.getElementById("formatter-ui-container");
  if (!currentFormatter) {
    currentFormatter = new InkFormulaFormatter(formatterContainer, {
      onChange: handleFormatterChange
    });
  }

  if (formulaData) {
    currentEditedFormulaId = formulaData.id;
    currentFormatter.setData(formulaData);
  } else {
    currentEditedFormulaId = null;
    currentFormatter.reset(); // Clear form for new entry
  }
  handleFormatterChange(); // Update save button state initially
}

function handleFormatterChange() {
  const saveButton = document.getElementById("editor-save-button");
  if (saveButton) {
    saveButton.disabled = !currentFormatter.isValid();
  }
}

// --- Data Loading (from your server) ---

async function loadFormulas() {
  try {
    const response = await fetch("/api/inkformulas");

    if (!response.ok) {
      throw new Error(`Failed to fetch ink formulas: ${response.status}`);
    }

    const rawData = await response.json();

    allFormulas = rawData.map((item) => {
      const { _id, ...rest } = item;
      return { id: normalizeId(_id), ...rest };
    });

    allFormulas = sortFormulas(allFormulas);
    updateDisplayedResults();
    console.log("Ink formulas loaded from server");
  } catch (error) {
    console.error("Error loading ink formulas:", error);
    document.getElementById("ink-formula-search-results").innerHTML =
      "<p>Failed to load ink formulas. Please try again later.</p>";
  }
}

// --- Helper Functions ---

function computeDisplayedResults() {
  const searchTerm = (
    document.getElementById("ink-formula-search-input")?.value || ""
  ).toLowerCase();
  let intermediateFormulas = allFormulas;

  if (searchTerm) {
    intermediateFormulas = intermediateFormulas.filter(
      (formula) =>
        (typeof formula.formulaName === "string" &&
          formula.formulaName.toLowerCase().includes(searchTerm)) ||
        (typeof formula.displayText === "string" &&
          formula.displayText.toLowerCase().includes(searchTerm)) ||
        (formula.structuredFormula &&
          formula.structuredFormula.some((item) => {
            if (item.type === "color") {
              const colorMatch =
                typeof item.color === "string" &&
                item.color.toLowerCase().includes(searchTerm);
              const baseMatch =
                typeof item.base === "string" &&
                item.base.toLowerCase().includes(searchTerm);
              const ingredientMatch =
                item.ingredients &&
                item.ingredients.some(
                  (ing) =>
                    typeof ing.ingredient === "string" &&
                    ing.ingredient.toLowerCase().includes(searchTerm)
                );
              return colorMatch || baseMatch || ingredientMatch;
            }
            return false;
          }))
    );
  }
  return intermediateFormulas;
}

function updateDisplayedResults() {
  const results = computeDisplayedResults();
  displayResults(results);
}

// --- Search Setup ---

function setupSearch() {
  const searchInput = document.getElementById("ink-formula-search-input");
  const clearSearchButton = document.getElementById(
    "ink-formula-clear-search-button"
  );

  if (!searchInput) {
    return;
  }

  if (clearSearchButton) {
    clearSearchButton.style.display = searchInput.value ? "block" : "none";
  }

  searchInput.addEventListener("input", () => {
    updateDisplayedResults();
    if (clearSearchButton) {
      clearSearchButton.style.display = searchInput.value ? "block" : "none";
    }
  });

  if (clearSearchButton) {
    clearSearchButton.addEventListener("click", () => {
      searchInput.value = "";
      clearSearchButton.style.display = "none";
      updateDisplayedResults();
    });
  }
}

// --- Display Results & Editing ---

function displayResults(results = allFormulas) {
  const resultsContainer = document.getElementById("ink-formula-search-results");
  resultsContainer.innerHTML = "";

  if (results.length === 0) {
    resultsContainer.innerHTML = "<p>No ink formulas found.</p>";
    return;
  }

  results.forEach((formula) => {
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";
    resultItem.dataset.id = formula.id;

    // Create a summary for display
    let summaryText = "";
    if (formula.structuredFormula && formula.structuredFormula.length > 0) {
      const colors = formula.structuredFormula
        .filter((item) => item.type === "color")
        .map((item) => item.color)
        .join(", ");
      const bases = [
        ...new Set(
          formula.structuredFormula
            .filter((item) => item.type === "color" && item.base)
            .map((item) => item.base)
        ),
      ].join(", ");

      if (colors) summaryText += `Colors: ${colors}`;
      if (bases) summaryText += `${summaryText ? "; " : ""}Bases: ${bases}`;
    } else {
      summaryText = "No detailed formula data.";
    }

    resultItem.innerHTML = `
            <div class="result-column formula-name">${
              formula.formulaName || "Untitled Formula"
            }</div>
            <div class="result-column formula-summary">${summaryText}</div>
            <div class="result-column result-buttons">
                <button class="edit-button" data-id="${formula.id}">Edit</button>
                <button class="delete-button" data-id="${formula.id}">Delete</button>
            </div>
        `;

    resultsContainer.appendChild(resultItem);
  });
}

// --- Event Delegation Setup ---

function setupListButtonDelegation() {
  const resultsContainer = document.getElementById("ink-formula-search-results");

  resultsContainer.addEventListener("click", (event) => {
    const target = event.target;
    if (
      target.classList.contains("edit-button") ||
      target.classList.contains("delete-button")
    ) {
      const formulaId = target.dataset.id;
      const formula = allFormulas.find((f) => f.id === formulaId);

      if (formula) {
        if (target.classList.contains("edit-button")) {
          showEditorView(formula);
        } else if (target.classList.contains("delete-button")) {
          deleteFormula(formulaId);
        }
      } else {
        console.error("Formula not found for ID:", formulaId);
      }
    }
  });
}

// --- Sort Data Function ---
function sortFormulas(formulas) {
  return formulas.sort((a, b) =>
    (a.formulaName || "").localeCompare(b.formulaName || "")
  );
}

// --- Save/Delete Formula (to your server) ---

async function saveFormula() {
  if (!currentFormatter) return;

  const formulaData = currentFormatter.getData();
  if (!currentFormatter.isValid()) {
    alert("Please fill in all required fields in the formula editor.");
    return;
  }

  try {
    let response;
    let url = "/api/inkformulas";
    let method = "POST";

    if (currentEditedFormulaId) {
      // Editing existing formula
      url = `/api/inkformulas/${currentEditedFormulaId}`;
      method = "PUT";
    }

    response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formulaData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to ${currentEditedFormulaId ? "update" : "create"} ink formula: ${
          response.status
        } - ${errorData.error || "Unknown error"}`
      );
    }

    // Refresh data after successful save
    await loadFormulas();
    showListView();
  } catch (error) {
    console.error("Error saving ink formula:", error);
    alert(`Failed to save ink formula: ${error.message}`);
  }
}

async function deleteFormula(formulaId) {
  if (!confirm("Are you sure you want to delete this ink formula?")) {
    return;
  }

  try {
    const response = await fetch(`/api/inkformulas/${formulaId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to delete ink formula: ${response.status} - ${
          errorData.error || "Unknown error"
        }`
      );
    }

    // Remove from allFormulas and update display
    allFormulas = allFormulas.filter((f) => f.id !== formulaId);
    updateDisplayedResults();
  } catch (error) {
    console.error("Error deleting ink formula:", error);
    alert(`Failed to delete ink formula: ${error.message}`);
  }
}

// --- Initial Load ---

document.addEventListener("DOMContentLoaded", () => {
  loadFormulas();
  setupSearch();
  setupListButtonDelegation();

  // Button to open new formula editor
  document
    .getElementById("ink-formula-new-entry-button")
    .addEventListener("click", () => showEditorView(null));

  // Editor action buttons
  document
    .getElementById("editor-back-button")
    .addEventListener("click", showListView);
  document
    .getElementById("editor-cancel-button")
    .addEventListener("click", showListView);
  document
    .getElementById("editor-save-button")
    .addEventListener("click", saveFormula);
});