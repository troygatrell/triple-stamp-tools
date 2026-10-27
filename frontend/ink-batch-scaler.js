/**
 * Ink Batch Scaler
 * Triple Stamp Tools - Screen Printing & Apparel Production
 */

document.addEventListener("DOMContentLoaded", async () => {
  const BASE_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.INK_FORMULA_API)
    ? API_CONFIG.INK_FORMULA_API
    : 'https://ink-formulas.onrender.com';

  // Search & Selection Elements
  const searchInput = document.getElementById("scaler-search-input");
  const clearSearchBtn = document.getElementById("scaler-clear-search-btn");
  const searchResultsContainer = document.getElementById("scaler-search-results");

  // Custom Formula Builder Elements
  const customToggle = document.getElementById("scaler-custom-toggle");
  const customBody = document.getElementById("scaler-custom-body");
  const customArrow = document.getElementById("scaler-custom-arrow");
  const customNameInput = document.getElementById("scaler-custom-name-input");
  const customBaseSelect = document.getElementById("scaler-custom-base-select");
  const customIngredientsList = document.getElementById("scaler-custom-ingredients-list");
  const customAddBtn = document.getElementById("scaler-custom-add-btn");
  const customResetBtn = document.getElementById("scaler-custom-reset-btn");

  const activeJobBar = document.getElementById("scaler-active-job-bar");
  const activeJobTitle = document.getElementById("scaler-active-job-title");
  const activeJobMeta = document.getElementById("scaler-active-job-meta");
  const colorChipsContainer = document.getElementById("scaler-color-chips-container");
  const unloadJobBtn = document.getElementById("scaler-unload-job-btn");

  const tableColorsBar = document.getElementById("scaler-table-colors-bar");
  const tableColorChipsContainer = document.getElementById("scaler-table-color-chips");
  const tableUnloadBtn = document.getElementById("scaler-table-unload-btn");

  // Formula Active Elements
  const activeColorTitle = document.getElementById("scaler-active-color-name");

  // Mode toggles
  const modeTargetBtn = document.getElementById("scaler-mode-target-btn");
  const modeJobBtn = document.getElementById("scaler-mode-job-btn");
  const targetModePanel = document.getElementById("scaler-target-mode-panel");
  const jobModePanel = document.getElementById("scaler-job-mode-panel");

  // Target mode elements
  const targetWeightInput = document.getElementById("scaler-target-weight");
  const presetButtons = document.querySelectorAll(".preset-btn");

  // Job estimator elements
  const jobGarmentsInput = document.getElementById("scaler-job-garments");
  const jobCoverageSelect = document.getElementById("scaler-job-coverage");
  const jobCustomCoverageGroup = document.getElementById("scaler-job-custom-coverage-group");
  const jobCustomCoverageInput = document.getElementById("scaler-job-custom-coverage");
  const jobMeshSelect = document.getElementById("scaler-job-mesh");
  const jobBufferSelect = document.getElementById("scaler-job-buffer");
  const estimatedGramsDisplay = document.getElementById("scaler-estimated-grams-display");
  const applyEstimatedBtn = document.getElementById("scaler-apply-estimated-btn");

  // Mixing table elements
  const mixingTbody = document.getElementById("scaler-mixing-tbody");
  const totalPctDisplay = document.getElementById("scaler-total-pct");
  const totalWeightDisplay = document.getElementById("scaler-total-weight");
  const finalScaleWeightDisplay = document.getElementById("scaler-final-scale-weight");
  const copyTicketBtn = document.getElementById("scaler-copy-ticket-btn");
  const resetChecksBtn = document.getElementById("scaler-reset-checks-btn");

  // Over-pour fixer
  const overpourToggle = document.getElementById("scaler-overpour-toggle");
  const overpourBody = document.getElementById("scaler-overpour-body");
  const overpourIngredientSelect = document.getElementById("scaler-overpour-ingredient");
  const overpourActualInput = document.getElementById("scaler-overpour-actual");
  const applyOverpourBtn = document.getElementById("scaler-apply-overpour-btn");

  // State
  let cachedFormulas = [];
  let currentLoadedFormula = null;
  let currentColorIdx = 0;
  let currentColorData = null; // { clientName, jobName, colorName, base, ingredients: [{ name, percentage }] }
  let checkedStepIndexes = new Set();
  let searchDebounceTimer = null;

  // Helper: Escape HTML
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    const parts = String(isoStr).split("-");
    if (parts.length === 3) {
      return `${parts[1]}-${parts[2]}-${parts[0]}`;
    }
    return isoStr;
  }

  // Number formatting helpers to prevent unwanted rounding of fine percentages and weights
  function formatPercentage(num) {
    if (num === null || num === undefined || isNaN(num)) return "0%";
    const clean = parseFloat(parseFloat(num).toFixed(5));
    return `${clean}%`;
  }

  function formatWeight(grams) {
    if (grams === null || grams === undefined || isNaN(grams)) return "0.0";
    const num = parseFloat(grams);
    if (num === 0) return "0.0";
    const clean = parseFloat(num.toFixed(4));
    const decimalPart = String(clean).split('.')[1] || '';
    if (decimalPart.length <= 1) {
      return clean.toFixed(1);
    }
    return String(clean);
  }

  // Fetch formulas and pre-index for instantaneous searching
  async function fetchFormulas() {
    try {
      let rawData = [];
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        let from = 0;
        const PAGE_SIZE = 1000;
        while (true) {
          const { data, error } = await supabaseClient
            .from("ink_formulas")
            .select("*")
            .order("formulaName", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (error) {
            console.warn("Supabase ink_formulas error, falling back to REST:", error);
            rawData = [];
            break;
          }
          if (!data || data.length === 0) break;
          rawData = rawData.concat(data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
      }

      // If Supabase had an issue or was not configured, fallback to backend REST API
      if (rawData.length === 0) {
        try {
          const response = await fetch(`${BASE_URL}/api/inkformulas`);
          if (response.ok) {
            rawData = await response.json();
          }
        } catch (restErr) {
          console.warn("REST fallback error:", restErr);
        }
      }

      cachedFormulas = (Array.isArray(rawData) ? rawData : []).map(f => {
        const formulaObj = { ...f, id: f.id || f._id };
        const rows = Array.isArray(formulaObj.rows) ? formulaObj.rows : [];
        const colorNames = rows.map(r => r.color || "").join(" ");
        const ingredientNames = rows.flatMap(r => Array.isArray(r.formula) ? r.formula.map(i => i.ingredient || "") : []).join(" ");
        
        formulaObj._searchText = [
          formulaObj.clientName || "",
          formulaObj.jobName || "",
          formulaObj.printLocation || "",
          formulaObj.date || "",
          formulaObj.formulaName || "",
          formulaObj.notes || "",
          colorNames,
          ingredientNames
        ].join(" ").toLowerCase();

        return formulaObj;
      });

      console.log(`Scaler: Loaded ${cachedFormulas.length} formulas for search.`);
    } catch (err) {
      console.warn("Scaler: Could not load saved formulas:", err);
      cachedFormulas = [];
    }
  }

  // Live Search Execution
  function handleSearchInput() {
    clearTimeout(searchDebounceTimer);
    const query = (searchInput.value || "").trim().toLowerCase();

    if (!query) {
      clearSearchBtn.style.display = "none";
      searchResultsContainer.style.display = "none";
      searchResultsContainer.innerHTML = "";
      return;
    }

    clearSearchBtn.style.display = "block";
    searchDebounceTimer = setTimeout(() => {
      executeSearch(query);
    }, 120);
  }

  function executeSearch(query) {
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = cachedFormulas.filter(f => {
      return terms.every(term => f._searchText.includes(term));
    });

    renderSearchResults(matches, `Search results for "${query}" (${matches.length} found)`);
  }

  function renderSearchResults(results, headingText = "") {
    searchResultsContainer.innerHTML = "";

    if (results.length === 0) {
      searchResultsContainer.innerHTML = `
        <div class="scaler-search-empty">
          <p>No formulas matched your search. Try searching by client name, job name, or Pantone color.</p>
        </div>
      `;
      searchResultsContainer.style.display = "block";
      return;
    }

    const header = document.createElement("div");
    header.className = "scaler-search-results-header";
    header.innerHTML = `<span>${escapeHtml(headingText || `Formulas (${results.length})`)}</span>`;
    searchResultsContainer.appendChild(header);

    const list = document.createElement("div");
    list.className = "scaler-search-results-list";

    // Show top 50 matches for performance
    const displayList = results.slice(0, 50);

    displayList.forEach(formula => {
      const card = document.createElement("div");
      card.className = "scaler-result-card";

      const rows = Array.isArray(formula.rows) ? formula.rows : [];
      const colorRows = rows.filter(r => r.type === "color" || (!r.type && r.color));

      const clientStr = formula.clientName || "Unnamed Client";
      const jobStr = formula.jobName || "Untitled Job";
      const metaParts = [];
      if (formula.printLocation) metaParts.push(formula.printLocation);
      if (formula.date) metaParts.push(formatDate(formula.date));
      const metaStr = metaParts.join(" • ");

      let colorChipsHtml = "";
      if (colorRows.length > 0) {
        colorChipsHtml = colorRows.map((r, idx) => `
          <button type="button" class="scaler-color-chip" data-formula-id="${formula.id}" data-color-idx="${idx}" title="Scale ${escapeHtml(r.color || 'this color')}">
            <span class="chip-dot"></span>
            <span class="chip-name">${escapeHtml(r.color || `Color #${idx + 1}`)}</span>
            <span class="chip-base">${escapeHtml(r.base || 'wdb')}</span>
          </button>
        `).join("");
      } else {
        colorChipsHtml = `<span style="font-size: 12px; color: var(--text-dim);">(No colors defined)</span>`;
      }

      card.innerHTML = `
        <div class="scaler-result-main">
          <div class="scaler-result-header-row">
            <div class="scaler-result-title-group">
              <strong class="scaler-result-client">${escapeHtml(clientStr)}</strong>
              <span class="scaler-result-divider">//</span>
              <span class="scaler-result-job">${escapeHtml(jobStr)}</span>
            </div>
            ${metaStr ? `<span class="scaler-result-meta">${escapeHtml(metaStr)}</span>` : ""}
          </div>
          <div class="scaler-result-colors">
            ${colorChipsHtml}
          </div>
        </div>
      `;

      // Wire clicking color chip
      card.querySelectorAll(".scaler-color-chip").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const colorIdx = parseInt(btn.dataset.colorIdx, 10) || 0;
          selectFormulaJob(formula, colorIdx);
        });
      });

      // Clicking card selects first color
      card.addEventListener("click", () => {
        if (colorRows.length > 0) {
          selectFormulaJob(formula, 0);
        }
      });

      list.appendChild(card);
    });

    if (results.length > 50) {
      const moreMsg = document.createElement("div");
      moreMsg.className = "scaler-search-more-msg";
      moreMsg.textContent = `Showing 50 of ${results.length} matches. Type more characters to narrow results.`;
      list.appendChild(moreMsg);
    }

    searchResultsContainer.appendChild(list);
    searchResultsContainer.style.display = "block";
  }

  // Render color switcher pills in both active banner and above mixing table
  function renderJobColorPills(colorRows, selectedIdx, formula) {
    colorChipsContainer.innerHTML = "";
    if (tableColorChipsContainer) tableColorChipsContainer.innerHTML = "";

    colorRows.forEach((r, idx) => {
      // Top banner pill
      const topPill = createColorPill(r, idx, selectedIdx, formula, colorRows);
      colorChipsContainer.appendChild(topPill);

      // Above-table pill
      if (tableColorChipsContainer) {
        const tablePill = createColorPill(r, idx, selectedIdx, formula, colorRows);
        tableColorChipsContainer.appendChild(tablePill);
      }
    });
  }

  function createColorPill(colorRow, idx, selectedIdx, formula, colorRows) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `scaler-job-pill ${idx === selectedIdx ? "active" : ""}`;
    pill.dataset.colorIdx = idx;
    pill.innerHTML = `
      <span class="pill-dot"></span>
      <span class="pill-name">${escapeHtml(colorRow.color || `Color #${idx + 1}`)}</span>
      <span class="pill-base">(${escapeHtml(colorRow.base || 'wdb')})</span>
    `;
    pill.addEventListener("click", () => {
      setActiveJobColor(idx, colorRows, formula);
    });
    return pill;
  }

  function setActiveJobColor(idx, colorRows, formula) {
    currentColorIdx = idx;
    document.querySelectorAll(".scaler-job-pill").forEach(p => {
      const pIdx = parseInt(p.dataset.colorIdx, 10);
      if (pIdx === idx) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });
    if (colorRows[idx]) {
      loadColorRow(colorRows[idx], formula);
    }
  }

  // Unload the current job and reset scaler to empty state
  function unloadCurrentJob() {
    currentLoadedFormula = null;
    currentColorData = null;
    currentColorIdx = 0;
    checkedStepIndexes.clear();

    activeJobBar.style.display = "none";
    if (tableColorsBar) tableColorsBar.style.display = "none";
    colorChipsContainer.innerHTML = "";
    if (tableColorChipsContainer) tableColorChipsContainer.innerHTML = "";
    activeJobTitle.textContent = "";
    activeJobMeta.textContent = "";

    resetCustomBuilderInputs();

    recalculateBatch();
  }

  if (unloadJobBtn) unloadJobBtn.addEventListener("click", unloadCurrentJob);
  if (tableUnloadBtn) tableUnloadBtn.addEventListener("click", unloadCurrentJob);

  // ==========================================
  // Collapsible Custom Formula Builder
  // ==========================================
  if (customToggle && customBody && customArrow) {
    customToggle.addEventListener("click", () => {
      const isHidden = customBody.style.display === "none";
      customBody.style.display = isHidden ? "block" : "none";
      customArrow.textContent = isHidden ? "▲" : "▼";
    });
  }

  function addCustomIngredientRow(name = "", percentage = "") {
    if (!customIngredientsList) return;
    const row = document.createElement("div");
    row.className = "scaler-ingredient-row";

    row.innerHTML = `
      <input type="text" class="scaler-ing-name" placeholder="Pigment / Component" value="${escapeHtml(name)}" />
      <div class="scaler-ing-pct-wrapper">
        <input type="number" class="scaler-ing-pct" placeholder="%" value="${percentage !== "" ? percentage : ""}" min="0" step="any" />
        <span class="pct-symbol">%</span>
      </div>
      <button type="button" class="scaler-remove-ing-btn" title="Remove ingredient">✕</button>
    `;

    const nameInput = row.querySelector(".scaler-ing-name");
    const pctInput = row.querySelector(".scaler-ing-pct");
    const removeBtn = row.querySelector(".scaler-remove-ing-btn");

    nameInput.addEventListener("input", syncCustomFormulaToState);
    pctInput.addEventListener("input", syncCustomFormulaToState);
    removeBtn.addEventListener("click", () => {
      row.remove();
      if (customIngredientsList.querySelectorAll(".scaler-ingredient-row").length === 0) {
        addCustomIngredientRow("", "");
      }
      syncCustomFormulaToState();
    });

    customIngredientsList.appendChild(row);
  }

  function syncCustomFormulaToState() {
    const nameVal = customNameInput ? customNameInput.value.trim() : "";
    const colorName = nameVal || "Custom Formula";
    const baseVal = customBaseSelect ? customBaseSelect.value : "wdb";

    const rows = customIngredientsList ? customIngredientsList.querySelectorAll(".scaler-ingredient-row") : [];
    const validIngredients = [];

    rows.forEach(r => {
      const name = r.querySelector(".scaler-ing-name").value.trim();
      const pct = parseFloat(r.querySelector(".scaler-ing-pct").value);
      if (name && !isNaN(pct) && pct > 0) {
        validIngredients.push({ name, percentage: pct });
      }
    });

    currentColorData = {
      clientName: "",
      jobName: "",
      colorName: colorName,
      base: baseVal,
      ingredients: validIngredients,
      isCustom: true
    };

    activeColorTitle.textContent = colorName.toUpperCase();
    checkedStepIndexes.clear();
    recalculateBatch();
  }

  function populateCustomBuilderFromColor(colorRow) {
    if (!customIngredientsList) return;
    if (customNameInput) {
      customNameInput.value = colorRow.color || "Custom Formula";
    }
    if (customBaseSelect) {
      const base = (colorRow.base || "wdb").toLowerCase().trim();
      let matched = false;
      for (let i = 0; i < customBaseSelect.options.length; i++) {
        if (customBaseSelect.options[i].value === base) {
          customBaseSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        customBaseSelect.value = "wdb";
      }
    }

    customIngredientsList.innerHTML = "";
    if (Array.isArray(colorRow.formula) && colorRow.formula.length > 0) {
      colorRow.formula.forEach(ing => {
        const pct = parseFloat(ing.percentage);
        const name = (ing.ingredient || "").trim();
        if (!isNaN(pct) && name) {
          addCustomIngredientRow(name, pct);
        }
      });
    } else {
      addCustomIngredientRow("", "");
    }
  }

  function resetCustomBuilderInputs() {
    if (customNameInput) customNameInput.value = "Custom Formula";
    if (customBaseSelect) customBaseSelect.value = "wdb";
    if (customIngredientsList) {
      customIngredientsList.innerHTML = "";
      addCustomIngredientRow("", "");
    }
  }

  if (customAddBtn) {
    customAddBtn.addEventListener("click", () => {
      addCustomIngredientRow("", "");
      const rows = customIngredientsList.querySelectorAll(".scaler-ingredient-row");
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const input = lastRow.querySelector(".scaler-ing-name");
        if (input) input.focus();
      }
    });
  }

  if (customResetBtn) {
    customResetBtn.addEventListener("click", () => {
      resetCustomBuilderInputs();
      unloadCurrentJob();
    });
  }

  if (customNameInput) {
    customNameInput.addEventListener("input", syncCustomFormulaToState);
  }

  if (customBaseSelect) {
    customBaseSelect.addEventListener("change", syncCustomFormulaToState);
  }

  // Load a full formula job and choose active color
  function selectFormulaJob(formula, colorIdx = 0) {
    currentLoadedFormula = formula;
    currentColorIdx = colorIdx;

    const rows = Array.isArray(formula.rows) ? formula.rows : [];
    const colorRows = rows.filter(r => r.type === "color" || (!r.type && r.color));

    // Show Active Job banner & above-table bar
    activeJobBar.style.display = "flex";
    if (tableColorsBar) tableColorsBar.style.display = "flex";

    activeJobTitle.textContent = `${formula.clientName || "Unnamed"} // ${formula.jobName || "Untitled"}`;
    
    const metaParts = [];
    if (formula.printLocation) metaParts.push(formula.printLocation);
    if (formula.date) metaParts.push(formatDate(formula.date));
    activeJobMeta.textContent = metaParts.length > 0 ? `(${metaParts.join(" • ")})` : "";

    // Render color switcher pills in active banner and above mixing table
    renderJobColorPills(colorRows, colorIdx, formula);

    // Collapse search results drawer to focus on mixing bench
    searchResultsContainer.style.display = "none";
    searchInput.value = "";
    clearSearchBtn.style.display = "none";

    // Load active color into scaler
    if (colorRows[colorIdx]) {
      loadColorRow(colorRows[colorIdx], formula);
    }
  }

  // Clear search input button
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.style.display = "none";
    searchResultsContainer.style.display = "none";
    searchResultsContainer.innerHTML = "";
    searchInput.focus();
  });

  searchInput.addEventListener("input", handleSearchInput);

  // Load a specific color data into active scaler state
  function loadColorRow(colorRow, formulaContext = null) {
    const client = formulaContext ? (formulaContext.clientName || "") : "";
    const job = formulaContext ? (formulaContext.jobName || "") : "";
    const colorName = colorRow.color || "Selected Color";
    const base = colorRow.base || "wdb";

    currentColorData = {
      clientName: client,
      jobName: job,
      colorName: colorName,
      base: base,
      ingredients: []
    };

    if (Array.isArray(colorRow.formula)) {
      colorRow.formula.forEach(ing => {
        const pct = parseFloat(ing.percentage);
        const name = (ing.ingredient || "").trim();
        if (!isNaN(pct) && name) {
          currentColorData.ingredients.push({ name: name, percentage: pct });
        }
      });
    }

    activeColorTitle.textContent = `${client ? client + " - " : ""}${job ? job + ": " : ""}${colorName.toUpperCase()}`;

    // Populate Custom Formula Builder inputs in case user wants to expand and tweak
    populateCustomBuilderFromColor(colorRow);

    checkedStepIndexes.clear();
    recalculateBatch();
  }

  // Mode switching
  modeTargetBtn.addEventListener("click", () => {
    modeTargetBtn.classList.add("active");
    modeJobBtn.classList.remove("active");
    targetModePanel.style.display = "block";
    jobModePanel.style.display = "none";
    recalculateBatch();
  });

  modeJobBtn.addEventListener("click", () => {
    modeJobBtn.classList.add("active");
    modeTargetBtn.classList.remove("active");
    jobModePanel.style.display = "block";
    targetModePanel.style.display = "none";
    updateJobEstimator();
  });

  // Target preset buttons
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const grams = btn.dataset.grams;
      targetWeightInput.value = grams;
      recalculateBatch();
    });
  });

  targetWeightInput.addEventListener("input", () => {
    recalculateBatch();
  });

  // Job Run Estimator
  jobCoverageSelect.addEventListener("change", () => {
    if (jobCoverageSelect.value === "custom") {
      jobCustomCoverageGroup.style.display = "flex";
    } else {
      jobCustomCoverageGroup.style.display = "none";
    }
    updateJobEstimator();
  });

  [jobGarmentsInput, jobCustomCoverageInput, jobMeshSelect, jobBufferSelect].forEach(input => {
    input.addEventListener("input", updateJobEstimator);
    input.addEventListener("change", updateJobEstimator);
  });

  function updateJobEstimator() {
    const garments = parseInt(jobGarmentsInput.value, 10) || 0;
    let baseGramsPerShirt = parseFloat(jobCoverageSelect.value);
    if (jobCoverageSelect.value === "custom") {
      baseGramsPerShirt = parseFloat(jobCustomCoverageInput.value) || 0;
    }
    const meshFactor = parseFloat(jobMeshSelect.value) || 1.0;
    const buffer = parseFloat(jobBufferSelect.value) || 0;

    const totalEst = Math.round((garments * baseGramsPerShirt * meshFactor) + buffer);
    estimatedGramsDisplay.textContent = `${totalEst}g`;
    return totalEst;
  }

  applyEstimatedBtn.addEventListener("click", () => {
    const est = updateJobEstimator();
    targetWeightInput.value = est;
    modeTargetBtn.click();
    recalculateBatch();
  });

  // Checkbox resets
  resetChecksBtn.addEventListener("click", () => {
    checkedStepIndexes.clear();
    mixingTbody.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);
    mixingTbody.querySelectorAll("tr").forEach(tr => tr.classList.remove("step-completed"));
  });

  // Over-pour panel toggle
  overpourToggle.addEventListener("click", () => {
    const isHidden = overpourBody.style.display === "none";
    overpourBody.style.display = isHidden ? "block" : "none";
    overpourToggle.querySelector(".overpour-arrow").textContent = isHidden ? "▲" : "▼";
  });

  // Core Math & Recalculate (Parts-Over-Base Formulation Model)
  function recalculateBatch() {
    const baseGrams = parseFloat(targetWeightInput.value) || 0;

    mixingTbody.innerHTML = "";
    overpourIngredientSelect.innerHTML = "";

    if (!currentColorData || (!currentColorData.clientName && !currentColorData.jobName && (!currentColorData.ingredients || currentColorData.ingredients.length === 0))) {
      mixingTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 36px 16px; font-size: 0.95rem;">Search for a formula above to start mixing.</td></tr>`;
      totalPctDisplay.textContent = "--";
      totalWeightDisplay.textContent = "--";
      finalScaleWeightDisplay.textContent = "--";
      overpourIngredientSelect.innerHTML = `<option value="">No active formula loaded</option>`;
      activeColorTitle.textContent = "Scale Mixing Targets";
      return;
    }

    const baseName = currentColorData.base || "Base";
    const pigments = currentColorData.ingredients || [];

    // Step 1 is always the Starting Base (100% reference)
    const components = [
      {
        name: `${baseName.toUpperCase()} (Base)`,
        percentage: 100.0,
        isBase: true,
        weight: baseGrams
      }
    ];

    let totalPigmentPct = 0;
    let totalPouredGrams = baseGrams;
    let runningScaleWeight = baseGrams;

    // Steps 2+ are the pigments added directly on top of base: weight = baseGrams * (pct / 100)
    pigments.forEach(p => {
      const pct = parseFloat(p.percentage) || 0;
      totalPigmentPct += pct;
      const weight = baseGrams * (pct / 100);
      components.push({
        name: p.name,
        percentage: pct,
        isBase: false,
        weight: weight
      });
    });

    components.forEach((comp, idx) => {
      const compWeight = comp.weight;
      if (idx > 0) {
        runningScaleWeight += compWeight;
        totalPouredGrams += compWeight;
      }

      const currentScaleTarget = idx === 0 ? baseGrams : runningScaleWeight;

      // Populate Over-pour dropdown
      const opt = document.createElement("option");
      opt.value = idx;
      if (comp.isBase) {
        opt.textContent = `${comp.name} (Base - Target: ${formatWeight(compWeight)}g)`;
      } else {
        opt.textContent = `${comp.name} (${formatPercentage(comp.percentage)} - Target: ${formatWeight(compWeight)}g)`;
      }
      overpourIngredientSelect.appendChild(opt);

      // Render Row
      const tr = document.createElement("tr");
      const isChecked = checkedStepIndexes.has(idx);
      if (isChecked) tr.classList.add("step-completed");

      const pctDisplay = comp.isBase ? "Base" : formatPercentage(comp.percentage);

      tr.innerHTML = `
        <td style="text-align: center;"><span class="step-num">${idx + 1}</span></td>
        <td><strong>${escapeHtml(comp.name)}</strong></td>
        <td>${pctDisplay}</td>
        <td class="scaler-weight-highlight">+${formatWeight(compWeight)} g</td>
        <td class="scaler-cumulative-cell">${formatWeight(currentScaleTarget)} g</td>
        <td style="text-align: center;">
          <input type="checkbox" class="scaler-step-check" data-index="${idx}" ${isChecked ? "checked" : ""} />
        </td>
      `;

      const check = tr.querySelector(".scaler-step-check");
      check.addEventListener("change", (e) => {
        if (e.target.checked) {
          checkedStepIndexes.add(idx);
          tr.classList.add("step-completed");
        } else {
          checkedStepIndexes.delete(idx);
          tr.classList.remove("step-completed");
        }
      });

      mixingTbody.appendChild(tr);
    });

    totalPctDisplay.textContent = totalPigmentPct > 0 ? `+${formatPercentage(totalPigmentPct)}` : "100%";
    totalWeightDisplay.textContent = `${formatWeight(totalPouredGrams)} g`;
    finalScaleWeightDisplay.textContent = `${formatWeight(totalPouredGrams)} g`;

    currentColorData._calculatedComponents = components;
    currentColorData._baseGrams = baseGrams;
    currentColorData._totalYieldGrams = totalPouredGrams;
  }

  // Over-pour correction (Parts-Over-Base)
  applyOverpourBtn.addEventListener("click", () => {
    if (!currentColorData || !currentColorData._calculatedComponents) return;
    const selectedIdx = parseInt(overpourIngredientSelect.value, 10);
    const actualGrams = parseFloat(overpourActualInput.value);

    if (isNaN(actualGrams) || actualGrams <= 0) {
      alert("Please enter the actual grams poured onto your scale.");
      return;
    }

    const component = currentColorData._calculatedComponents[selectedIdx];
    if (!component) return;

    if (component.isBase) {
      // Over-poured starting base
      if (confirm(`Over-poured base: Starting base will increase from ${targetWeightInput.value}g to ${actualGrams.toFixed(1)}g and all pigments will scale to match. Apply new base weight?`)) {
        targetWeightInput.value = Math.round(actualGrams * 10) / 10;
        overpourActualInput.value = "";
        overpourBody.style.display = "none";
        overpourToggle.querySelector(".overpour-arrow").textContent = "▼";
        recalculateBatch();
      }
    } else {
      // Over-poured a pigment: newBase = actualGrams / (pct / 100)
      if (component.percentage <= 0) {
        alert("Cannot rescale from a 0% component.");
        return;
      }
      const newRequiredBase = Math.round((actualGrams / (component.percentage / 100)) * 10) / 10;
      if (confirm(`Over-poured ${component.name}: To keep formula true to ratio, starting base must increase from ${targetWeightInput.value}g to ${newRequiredBase.toFixed(1)}g (add +${(newRequiredBase - parseFloat(targetWeightInput.value)).toFixed(1)}g more base). Apply new base weight?`)) {
        targetWeightInput.value = Math.round(newRequiredBase);
        overpourActualInput.value = "";
        overpourBody.style.display = "none";
        overpourToggle.querySelector(".overpour-arrow").textContent = "▼";
        recalculateBatch();
      }
    }
  });

  // Copy Mixing Ticket
  copyTicketBtn.addEventListener("click", async () => {
    if (!currentColorData || !currentColorData._calculatedComponents) {
      alert("No active formula to copy.");
      return;
    }

    const baseGrams = parseFloat(targetWeightInput.value) || 0;
    const totalYield = currentColorData._totalYieldGrams || baseGrams;
    const title = activeColorTitle.textContent || "Ink Formula";
    const dateStr = new Date().toLocaleDateString();

    let text = `==============================\n`;
    text += `TRIPLE STAMP TOOLS - INK MIX TICKET\n`;
    text += `Formula: ${title}\n`;
    text += `Starting Base: ${formatWeight(baseGrams)}g  |  Total Yield: ${formatWeight(totalYield)}g\n`;
    text += `Date: ${dateStr}\n`;
    text += `==============================\n`;

    let running = 0;
    currentColorData._calculatedComponents.forEach((comp, i) => {
      const weight = comp.weight;
      running += weight;
      const desc = comp.isBase ? '(Starting Base)' : `(${formatPercentage(comp.percentage)})`;
      text += `[ ] Step ${i + 1}: ${comp.name} ${desc}\n`;
      text += `    Add: +${formatWeight(weight)}g  (Scale Target: ${formatWeight(running)}g)\n`;
    });
    text += `==============================\n`;
    text += `Total Mixed Yield: ${formatWeight(totalYield)}g\n`;

    try {
      await navigator.clipboard.writeText(text);
      const originalText = copyTicketBtn.textContent;
      copyTicketBtn.textContent = "✓ Copied to Clipboard!";
      setTimeout(() => {
        copyTicketBtn.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error("Clipboard copy error:", err);
      alert("Could not copy automatically. Here is your mixing ticket:\n\n" + text);
    }
  });

  // Cross-tool listener: Listen for event from Ink Formula Formatter
  window.addEventListener("scale-ink-formula", (e) => {
    const detail = e.detail;
    if (!detail) return;

    currentColorData = {
      clientName: detail.clientName || "",
      jobName: detail.jobName || "",
      colorName: detail.color || "Selected Color",
      base: detail.base || "wdb",
      ingredients: (detail.ingredients || []).map(ing => ({
        name: ing.ingredient || ing.name,
        percentage: parseFloat(ing.percentage) || 0
      }))
    };

    const singleRow = [{
      color: currentColorData.colorName,
      base: currentColorData.base,
      formula: currentColorData.ingredients
    }];
    currentLoadedFormula = {
      clientName: detail.clientName || "",
      jobName: detail.jobName || "",
      rows: singleRow
    };
    currentColorIdx = 0;

    activeJobBar.style.display = "flex";
    if (tableColorsBar) tableColorsBar.style.display = "flex";
    activeJobTitle.textContent = `${detail.clientName || "Formula"} // ${detail.jobName || "Selected Mix"}`;
    activeJobMeta.textContent = "";

    renderJobColorPills(singleRow, 0, currentLoadedFormula);

    activeColorTitle.textContent = `${currentColorData.clientName ? currentColorData.clientName + " - " : ""}${currentColorData.jobName ? currentColorData.jobName + ": " : ""}${currentColorData.colorName.toUpperCase()}`;

    // Populate Custom Formula Builder inputs
    populateCustomBuilderFromColor(singleRow[0]);

    checkedStepIndexes.clear();
    recalculateBatch();

    const scalerSec = document.getElementById("ink-batch-scaler");
    if (scalerSec) {
      scalerSec.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Initial load
  resetCustomBuilderInputs();
  await fetchFormulas();
  recalculateBatch();
});
