document.addEventListener("DOMContentLoaded", async () => {
  const BASE_URL = 'https://triplestamptools.onrender.com';
  const tableBody = document.querySelector("#formula-table tbody");
  const addRowBtn = document.getElementById("add-row-btn");
  const addFlashBtn = document.getElementById("add-flash-btn");
  const copyBtn = document.getElementById("copy-btn");
  const resetBtn = document.getElementById("reset-btn");
  const outputFrame = document.getElementById("output-frame");
  let latestOutput = { html: "", text: "" };
  let currentFormulaId = null; // To store the _id of the currently loaded formula
  let cachedFormulas = []; // To store formulas for local filtering

  const clientNameInput = document.getElementById("formula-name");
  const jobNameInput = document.getElementById("formula-age");
  const printLocationInput = document.getElementById("print-location");
  const dateInput = document.getElementById("formula-date");

  const saveFormulaBtn = document.getElementById("save-formula-btn");
  const loadFormulaSelect = document.getElementById("load-formula-select");
  const deleteFormulaBtn = document.getElementById("delete-formula-btn");
  const excludeColorOrderCheckbox = document.getElementById("exclude-color-order-checkbox");

  const easternIsoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  function formatDateForDisplay(value) {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return "";
    return `${month}-${day}-${year}`;
  }

  if (dateInput && !dateInput.value) {
    dateInput.value = easternIsoFormatter.format(new Date());
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const INGREDIENT_OPTIONS_RAW = [
    "yellow", "gold", "pink", "rubine", "orange", "black", "green", "violet", "process",
    "reflex", "agent", "other", "flo yellow", "flo pink", "flo orange", "flo green",
    "flo blue", "flo red", "warm red"
  ];

  const INGREDIENT_OPTIONS = INGREDIENT_OPTIONS_RAW
    .slice()
    .filter((v) => v !== "other")
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  if (INGREDIENT_OPTIONS_RAW.indexOf("other") !== -1) {
    INGREDIENT_OPTIONS.push("other");
  }

  const BASE_OPTIONS_RAW = ["wdb", "cdb", "ez clear", "stretch", "301", "other"];
  const BASE_OPTIONS = BASE_OPTIONS_RAW
    .slice()
    .filter((v) => v !== "other")
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  if (BASE_OPTIONS_RAW.indexOf("other") !== -1) {
    BASE_OPTIONS.push("other");
  }

  function buildSelect(options, selectedValue = "", className = "", placeholder = "(select)") {
    let selectHtml = `<select class="${className}">`;
    const valueInOptions = options.indexOf(selectedValue) !== -1 && selectedValue !== "";

    if (!selectedValue) {
      selectHtml += `<option value="" disabled selected>${placeholder}</option>`;
      options.forEach((option) => selectHtml += `<option value="${option}">${option}</option>`);
      selectHtml += `</select>`;
      return { selectHtml, otherValue: "" };
    }

    if (valueInOptions) {
      selectHtml += `<option value="" disabled>${placeholder}</option>`;
      options.forEach((option) => {
        selectHtml += `<option value="${option}" ${selectedValue === option ? "selected" : ""}>${option}</option>`;
      });
      selectHtml += `</select>`;
      return { selectHtml, otherValue: "" };
    }

    selectHtml += `<option value="" disabled>${placeholder}</option>`;
    options.forEach((option) => {
      selectHtml += `<option value="${option}" ${option === "other" ? "selected" : ""}>${option}</option>`;
    });
    selectHtml += `</select>`;
    return { selectHtml, otherValue: selectedValue || "" };
  }

  function getSelectedOrOther(container, dropdownSelector, otherInputSelector) {
    const dropdown = container.querySelector(dropdownSelector);
    if (!dropdown) return "";
    if (dropdown.value === "other") {
      const otherInput = container.querySelector(otherInputSelector);
      return otherInput ? otherInput.value.trim() : "";
    }
    return dropdown.value ? dropdown.value.trim() : "";
  }

  function setOutputContent(displayHtml, text, clipboardHtml) {
    if (!outputFrame) return;
    const hasContent = displayHtml && displayHtml.trim().length > 0;
    const clipboardMarkup = hasContent
      ? `<div style="font-family:'Roboto','Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.2;font-weight:400;color:#000;text-decoration:none;">${clipboardHtml}</div>`
      : "";

    latestOutput = { html: clipboardMarkup, text: hasContent ? text : "" };

    const displayMarkup = hasContent
      ? `<div class="line-stack">${displayHtml}</div>`
      : '<p class="empty-state">Formatted output will appear here once all required fields are complete.</p>';

    const doc = outputFrame.contentDocument || outputFrame.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
      :root { color-scheme: dark; }
      body { margin: 0; padding: 12px 14px; font-family: "Roboto", "Helvetica Neue", Arial, sans-serif; background: transparent; color: #e7fff4; line-height: 1.15; }
      .line-stack { display: block; }
      .line { margin: 0; }
      .line + .line { margin-top: 2px; }
      .line strong { font-weight: 700; }
      .empty-state { opacity: 0.65; }
      strong { font-weight: 700; }
      u { text-decoration-color: rgba(231, 255, 244, 0.9); }
    </style></head><body>${displayMarkup}</body></html>`);
    doc.close();
  }

  function validateForm() {
    const clientName = clientNameInput.value.trim();
    const jobName = jobNameInput.value.trim();
    const date = dateInput.value.trim();
    if (!clientName || !jobName || !date) return false;

    const rows = tableBody.querySelectorAll("tr");
    for (const row of rows) {
      if (row.dataset.type === "flash") continue;
      const color = row.querySelector(".color-input").value.trim();
      const baseValue = getSelectedOrOther(row, ".base-dropdown", ".base-other-input-container .other-input");
      if (!color || !baseValue.trim()) return false;

      const ingredientGroups = row.querySelectorAll(".formula-ingredient-group");
      if (ingredientGroups.length === 0) return false;
      for (const group of ingredientGroups) {
        const percentage = group.querySelector(".percentage-input").value.trim();
        const ingredientValue = getSelectedOrOther(group, ".ingredient-dropdown", ".other-input-container .other-input");
        if (!percentage || !ingredientValue.trim()) return false;
      }
    }
    return true;
  }

  const mobileMediaQuery = window.matchMedia("(max-width: 768px)");
  function initializeSortable() {
    if (mobileMediaQuery.matches) {
      if ($(tableBody).data("uiSortable")) $(tableBody).sortable("destroy");
    } else {
      if (!$(tableBody).data("uiSortable")) {
        $(tableBody).sortable({
          axis: "y", items: "tr", cursor: "move",
          placeholder: "ui-state-highlight", stop: () => generateOutput()
        });
      }
    }
  }
  mobileMediaQuery.addEventListener("change", initializeSortable);

  function handleOtherOption(dropdown, inputContainer, generateOutputCallback) {
    if (dropdown.value === "other") {
      inputContainer.innerHTML = `<input type="text" class="other-input">`;
      inputContainer.style.display = "block";
      dropdown.classList.add("compact-dropdown");
      inputContainer.classList.add("other-expanded");
      inputContainer.querySelector(".other-input").addEventListener("input", () => {
        generateOutputCallback();
        updateCopyButtonState();
      });
    } else {
      inputContainer.innerHTML = "";
      inputContainer.style.display = "none";
      dropdown.classList.remove("compact-dropdown");
      inputContainer.classList.remove("other-expanded");
    }
    generateOutputCallback();
    updateCopyButtonState();
  }

  function createFormulaIngredientRow(initialPercentage = "", initialIngredient = "", parentContainer) {
    const ingredientGroup = document.createElement("div");
    ingredientGroup.className = "formula-ingredient-group";
    const { selectHtml: ingredientDropdownHtml, otherValue: initialOtherIngredientValue } = (function () {
      return buildSelect(INGREDIENT_OPTIONS, initialIngredient, "ingredient-dropdown", "(ingredient)");
    })();

    ingredientGroup.innerHTML = `
      <input type="number" class="percentage-input" value="${initialPercentage}" min="0" step="0.1" pattern="[0-9]*[.]?[0-9]+" placeholder="%" title="Numbers only">
      ${ingredientDropdownHtml}
      <div class="other-input-container" style="display:${initialOtherIngredientValue ? "block" : "none"};">
        ${initialOtherIngredientValue ? `<input type="text" class="other-input" value="${initialOtherIngredientValue}">` : ""}
      </div>
      <button type="button" class="remove-ingredient-btn">x</button>
    `;

    const percentageInput = ingredientGroup.querySelector(".percentage-input");
    const ingredientDropdown = ingredientGroup.querySelector(".ingredient-dropdown");
    const otherIngredientInputContainer = ingredientGroup.querySelector(".other-input-container");
    const removeButton = ingredientGroup.querySelector(".remove-ingredient-btn");

    percentageInput.addEventListener("input", () => { generateOutput(); updateCopyButtonState(); });
    ingredientDropdown.addEventListener("change", (e) => handleOtherOption(e.target, otherIngredientInputContainer, generateOutput));

    if (initialOtherIngredientValue) {
      ingredientDropdown.classList.add("compact-dropdown");
      otherIngredientInputContainer.classList.add("other-expanded");
    }
    if (ingredientGroup.querySelector(".other-input")) {
      ingredientGroup.querySelector(".other-input").addEventListener("input", () => { generateOutput(); updateCopyButtonState(); });
    }
    removeButton.addEventListener("click", () => { ingredientGroup.remove(); generateOutput(); updateCopyButtonState(); });
    parentContainer.appendChild(ingredientGroup);
  }

  function createRow(data = {}) {
    const row = document.createElement("tr");
    const { selectHtml: baseDropdownHtml, otherValue: initialOtherBaseValue } = (function () {
      return buildSelect(BASE_OPTIONS, data.base || "", "base-dropdown", "(base)");
    })();

    row.innerHTML = `
      <td data-label="Color">
        <button class="collapse-toggle">▶</button>
        <input type="text" class="color-input" value="${data.color || ""}">
        <div class="up-down-buttons">
          <button class="up-down-btn up-btn">▲</button>
          <button class="up-down-btn down-btn">▼</button>
        </div>
      </td>
      <td data-label="Base">
        ${baseDropdownHtml}
        <div class="other-input-container base-other-input-container" style="display:${initialOtherBaseValue ? "block" : "none"};">
          ${initialOtherBaseValue ? `<input type="text" class="other-input" value="${initialOtherBaseValue}" placeholder="Enter base name...">` : ""}
        </div>
      </td>
      <td data-label="Formula"><div class="formula-ingredients-container"></div></td>
      <td data-label="Actions">
        <button type="button" class="add-ingredient-btn">Add Ingredient</button>
        <button class="delete-btn">Delete Color</button>
      </td>
    `;

    const collapseToggle = row.querySelector(".collapse-toggle");
    const baseDropdown = row.querySelector(".base-dropdown");
    const otherBaseInputContainer = row.querySelector(".base-other-input-container");
    const formulaIngredientsContainer = row.querySelector(".formula-ingredients-container");
    const addIngredientBtn = row.querySelector(".add-ingredient-btn");
    const colorInput = row.querySelector(".color-input");
    const upBtn = row.querySelector(".up-btn");
    const downBtn = row.querySelector(".down-btn");

    if (mobileMediaQuery.matches) {
      row.classList.add("collapsed");
      collapseToggle.classList.remove("expanded");
    } else {
      row.classList.remove("collapsed");
      collapseToggle.classList.add("expanded");
    }

    collapseToggle.addEventListener("click", () => {
      row.classList.toggle("collapsed");
      collapseToggle.classList.toggle("expanded");
    });

    upBtn.addEventListener("click", () => {
      const prevRow = row.previousElementSibling;
      if (prevRow) { $(row).insertBefore(prevRow); generateOutput(); }
    });

    downBtn.addEventListener("click", () => {
      const nextRow = row.nextElementSibling;
      if (nextRow) { $(row).insertAfter(nextRow); generateOutput(); }
    });

    baseDropdown.addEventListener("change", (e) => handleOtherOption(e.target, otherBaseInputContainer, generateOutput));
    if (row.querySelector(".base-other-input-container .other-input")) {
      row.querySelector(".base-other-input-container .other-input").addEventListener("input", () => { generateOutput(); updateCopyButtonState(); });
    }

    if (initialOtherBaseValue) {
      baseDropdown.classList.add("compact-dropdown");
      otherBaseInputContainer.classList.add("other-expanded");
    }

    addIngredientBtn.addEventListener("click", () => {
      createFormulaIngredientRow("", "", formulaIngredientsContainer);
      generateOutput(); updateCopyButtonState();
    });

    row.querySelector(".delete-btn").addEventListener("click", () => {
      row.remove(); generateOutput(); updateCopyButtonState();
    });

    colorInput.addEventListener("input", () => { generateOutput(); updateCopyButtonState(); });

    if (data.formula && Array.isArray(data.formula) && data.formula.length > 0) {
      data.formula.forEach((ingredient) => createFormulaIngredientRow(ingredient.percentage, ingredient.ingredient, formulaIngredientsContainer));
    } else {
      createFormulaIngredientRow("", "", formulaIngredientsContainer);
    }
    tableBody.appendChild(row);
  }

  function createFlashRow() {
    const row = document.createElement("tr");
    row.dataset.type = "flash";
    row.innerHTML = `
      <td data-label="FLASH">
        <button class="collapse-toggle">▶</button><span class="color-text">FLASH</span>
        <div class="up-down-buttons">
          <button class="up-down-btn up-btn">▲</button>
          <button class="up-down-btn down-btn">▼</button>
        </div>
      </td>
      <td data-label="Base"></td><td data-label="Formula"></td>
      <td data-label="Actions"><button class="delete-btn">Delete Flash</button></td>
    `;
    const collapseToggle = row.querySelector(".collapse-toggle");
    const upBtn = row.querySelector(".up-btn");
    const downBtn = row.querySelector(".down-btn");

    if (mobileMediaQuery.matches) { row.classList.add("collapsed"); collapseToggle.classList.remove("expanded"); }
    else { row.classList.remove("collapsed"); collapseToggle.classList.add("expanded"); }

    collapseToggle.addEventListener("click", () => { row.classList.toggle("collapsed"); collapseToggle.classList.toggle("expanded"); });
    upBtn.addEventListener("click", () => { const prevRow = row.previousElementSibling; if (prevRow) { $(row).insertBefore(prevRow); generateOutput(); } });
    downBtn.addEventListener("click", () => { const nextRow = row.nextElementSibling; if (nextRow) { $(row).insertAfter(nextRow); generateOutput(); } });
    row.querySelector(".delete-btn").addEventListener("click", () => { row.remove(); generateOutput(); updateCopyButtonState(); });
    tableBody.appendChild(row);
  }

  function generateOutput() {
    const clientName = clientNameInput.value.trim();
    const jobName = jobNameInput.value.trim();
    const printLocation = printLocationInput.value.trim();
    const date = dateInput.value.trim();
    const rows = Array.from(tableBody.querySelectorAll("tr"));
    const colorOrder = [];

    rows.forEach((row) => {
      if (row.dataset.type === "flash") { colorOrder.push("flash"); return; }
      const colorValue = row.querySelector(".color-input")?.value.trim();
      if (colorValue) colorOrder.push(colorValue.toLowerCase());
    });

    const displayLines = []; const clipboardLines = []; const textLines = [];
    const pushLine = (displayHtml, clipboardHtml, textContent) => {
      if (!textContent) return;
      displayLines.push(`<div class="line">${displayHtml}</div>`);
      clipboardLines.push(`<p style="margin:0 0 2px 0;font-weight:normal;text-decoration:none;">${clipboardHtml}</p>`);
      textLines.push(textContent);
    };

    if (clientName) pushLine(`<strong><u>${escapeHtml(clientName)}</u></strong>`, `<b><u>${escapeHtml(clientName)}</u></b>`, clientName);

    if (jobName || date) {
      const formattedDate = formatDateForDisplay(date);
      let jobLineHtml = ""; let jobLineText = "";
      if (jobName) { jobLineHtml += `<strong>${escapeHtml(jobName)}</strong>`; jobLineText += jobName; }
      if (formattedDate) {
        const prefix = jobLineHtml ? " " : ""; const textPrefix = jobLineText ? " " : "";
        jobLineHtml += `${prefix}(${escapeHtml(formattedDate)})`; jobLineText += `${textPrefix}(${formattedDate})`;
      }
      if (jobLineHtml) {
        const clipboardJobHtml = [ jobName ? `<b>${escapeHtml(jobName)}</b>` : "", formattedDate ? `<span style="font-weight:normal;text-decoration:none;"> (${escapeHtml(formattedDate)})</span>` : "" ].join("");
        pushLine(jobLineHtml, clipboardJobHtml, jobLineText);
      }
    }

    if (printLocation) pushLine(escapeHtml(printLocation), `<span style="font-weight:normal;text-decoration:none;">${escapeHtml(printLocation)}</span>`, printLocation);

    if (!excludeColorOrderCheckbox.checked && colorOrder.length > 1) {
      pushLine(`color order: ${escapeHtml(colorOrder.join(" / "))}`, `<span style="font-weight:normal;text-decoration:none;">color order: ${escapeHtml(colorOrder.join(" / "))}</span>`, `color order: ${colorOrder.join(" / ")}`);
    }

    rows.forEach((row) => {
      if (row.dataset.type === "flash") return;
      const colorValue = row.querySelector(".color-input")?.value.trim().toLowerCase();
      if (!colorValue) return;

      const base = getSelectedOrOther(row, ".base-dropdown", ".base-other-input-container .other-input");
      const formulaIngredients = [];
      row.querySelectorAll(".formula-ingredient-group").forEach((group) => {
        const percentage = group.querySelector(".percentage-input")?.value.trim();
        const ingredient = getSelectedOrOther(group, ".ingredient-dropdown", ".other-input-container .other-input");
        if (percentage || ingredient) formulaIngredients.push(`${percentage}% ${ingredient}`.trim());
      });

      const baseText = base ? base.toLowerCase() : "";
      const formulaText = formulaIngredients.map((item) => item.toLowerCase()).join(" / ");
      const textSegments = [colorValue]; const htmlSegments = [`<strong>${escapeHtml(colorValue)}</strong>`];
      if (baseText) { textSegments.push(baseText); htmlSegments.push(escapeHtml(baseText)); }
      if (formulaText) { textSegments.push(formulaText); htmlSegments.push(escapeHtml(formulaText)); }

      const lineText = textSegments.join(" - "); const lineHtml = htmlSegments.join(" - ");
      const clipboardLine = `<b>${escapeHtml(colorValue)}</b>` + (baseText ? `<span style="font-weight:normal;text-decoration:none;"> - ${escapeHtml(baseText)}</span>` : "") + (formulaText ? `<span style="font-weight:normal;text-decoration:none;"> - ${escapeHtml(formulaText)}</span>` : "");
      pushLine(lineHtml, clipboardLine, lineText);
    });

    setOutputContent(displayLines.join(""), textLines.join("\n"), clipboardLines.join(""));
  }

  function updateCopyButtonState() { copyBtn.disabled = !validateForm(); }

  // --- API Interaction Functions ---

  async function fetchFormulasFromBackend() {
    try {
      const response = await fetch(`${BASE_URL}/api/inkformulas`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) { console.error("Error fetching ink formulas:", error); alert("Failed to load ink formulas. Please try again later."); return []; }
  }

  async function saveFormulaToBackend(formulaData, id = null) {
    try {
      const method = id ? 'PUT' : 'POST'; const url = id ? `${BASE_URL}/api/inkformulas/${id}` : `${BASE_URL}/api/inkformulas`;
      const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formulaData) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) { console.error("Error saving ink formula:", error); alert("Failed to save ink formula. Please try again later."); return null; }
  }

  async function deleteFormulaFromBackend(id) {
    try {
      const response = await fetch(`${BASE_URL}/api/inkformulas/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return true;
    } catch (error) { console.error("Error deleting ink formula:", error); alert("Failed to delete ink formula. Please try again later."); return false; }
  }

  async function populateLoadDropdown() {
    loadFormulaSelect.innerHTML = '<option value="">-- Select a saved formula --</option>';
    cachedFormulas = await fetchFormulasFromBackend();
    cachedFormulas.sort((a, b) => a.formulaName.localeCompare(b.formulaName));
    cachedFormulas.forEach(formula => {
      const option = document.createElement("option"); option.value = formula._id; option.textContent = formula.formulaName;
      loadFormulaSelect.appendChild(option);
    });
  }

  async function handleSaveFormula() {
    const clientName = clientNameInput.value.trim();
    const jobName = jobNameInput.value.trim();
    const date = dateInput.value.trim();
    if (!clientName || !jobName || !date) { alert("Please enter Client Name, Job Name, and Date to save the formula."); return; }
    const printLocation = printLocationInput.value.trim();
    const rowsData = [];
    tableBody.querySelectorAll("tr").forEach(row => {
      if (row.dataset.type === "flash") { rowsData.push({ type: "flash" }); }
      else {
        const color = row.querySelector(".color-input")?.value.trim() || "";
        const base = getSelectedOrOther(row, ".base-dropdown", ".base-other-input-container .other-input");
        const formulaIngredients = [];
        row.querySelectorAll(".formula-ingredient-group").forEach(group => {
          const percentage = group.querySelector(".percentage-input")?.value.trim() || "";
          const ingredient = getSelectedOrOther(group, ".ingredient-dropdown", ".other-input-container .other-input");
          formulaIngredients.push({ percentage, ingredient });
        });
        rowsData.push({ type: "color", color, base, formula: formulaIngredients });
      }
    });

    const formulaData = { clientName, jobName, printLocation, date, rows: rowsData };
    const savedFormula = await saveFormulaToBackend(formulaData, currentFormulaId);
    if (savedFormula) { currentFormulaId = savedFormula._id; await populateLoadDropdown(); alert(`Formula "${savedFormula.formulaName}" saved successfully!`); }
  }

  async function handleLoadFormula() {
    const formulaId = loadFormulaSelect.value;
    if (!formulaId) { currentFormulaId = null; resetBtn.click(); return; }
    try {
      const response = await fetch(`${BASE_URL}/api/inkformulas/${formulaId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const formulaData = await response.json();
      if (formulaData) {
        clientNameInput.value = formulaData.clientName || "";
        jobNameInput.value = formulaData.jobName || "";
        printLocationInput.value = formulaData.printLocation || "";
        dateInput.value = formulaData.date || "";
        tableBody.innerHTML = "";
        formulaData.rows.forEach(rowData => { if (rowData.type === "flash") createFlashRow(); else createRow(rowData); });
        currentFormulaId = formulaData._id; initializeSortable(); generateOutput(); updateCopyButtonState();
      }
    } catch (error) { console.error("Error loading ink formula:", error); alert("Failed to load ink formula. Please try again later."); }
  }

  async function handleDeleteFormula() {
    const formulaId = loadFormulaSelect.value;
    if (!formulaId) { alert("Please select a formula to delete."); return; }
    const selectedOptionText = loadFormulaSelect.options[loadFormulaSelect.selectedIndex].textContent;
    if (confirm(`Are you sure you want to delete formula "${selectedOptionText}"?`)) {
      if (await deleteFormulaFromBackend(formulaId)) { await populateLoadDropdown(); alert(`Formula "${selectedOptionText}" deleted successfully!`); currentFormulaId = null; resetBtn.click(); }
    }
  }

  function filterFormulas() {
    const clientName = clientNameInput.value.trim().toLowerCase();
    const jobName = jobNameInput.value.trim().toLowerCase();
    
    loadFormulaSelect.innerHTML = '<option value="">-- Select a saved formula --</option>';

    const filteredFormulas = cachedFormulas.filter(formula => {
      const lowerFormulaName = formula.formulaName.toLowerCase();
      return lowerFormulaName.includes(clientName) && lowerFormulaName.includes(jobName);
    });

    filteredFormulas.forEach(formula => {
      const option = document.createElement("option"); option.value = formula._id; option.textContent = formula.formulaName;
      loadFormulaSelect.appendChild(option);
    });
  }

  saveFormulaBtn.addEventListener("click", handleSaveFormula);
  loadFormulaSelect.addEventListener("change", handleLoadFormula);
  deleteFormulaBtn.addEventListener("click", handleDeleteFormula);
  clientNameInput.addEventListener("input", () => { generateOutput(); updateCopyButtonState(); filterFormulas(); });
  jobNameInput.addEventListener("input", () => { generateOutput(); updateCopyButtonState(); filterFormulas(); });
  printLocationInput.addEventListener("input", () => { generateOutput(); updateCopyButtonState(); });
  dateInput.addEventListener("input", () => { generateOutput(); updateCopyButtonState(); });
  excludeColorOrderCheckbox.addEventListener("change", generateOutput);

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      clientNameInput.value = ""; jobNameInput.value = ""; printLocationInput.value = "";
      dateInput.value = easternIsoFormatter.format(new Date());
      tableBody.innerHTML = ""; createRow(); initializeSortable(); generateOutput(); updateCopyButtonState();
      loadFormulaSelect.value = ""; currentFormulaId = null; await populateLoadDropdown();
    });
  }

  addRowBtn.addEventListener("click", () => { createRow(); initializeSortable(); generateOutput(); updateCopyButtonState(); });
  addFlashBtn.addEventListener("click", () => { createFlashRow(); initializeSortable(); generateOutput(); updateCopyButtonState(); });

  copyBtn.addEventListener("click", async () => {
    if (!latestOutput.html) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.write === "function" && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([latestOutput.html], { type: "text/html" }), "text/plain": new Blob([latestOutput.text], { type: "text/plain" }) })]);
      } else throw new Error("Clipboard API not available");
    } catch (error) {
      const fb = document.createElement("textarea"); fb.value = latestOutput.text; fb.style.position = "absolute"; fb.style.left = "-9999px"; document.body.appendChild(fb); fb.select(); document.execCommand("copy"); document.body.removeChild(fb);
    }
    alert("Ink formula copied to clipboard!");
  });

  await populateLoadDropdown();
  createRow();
  initializeSortable();
  generateOutput();
  updateCopyButtonState();
});
