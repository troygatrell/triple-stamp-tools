document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#formula-table tbody");
  const addRowBtn = document.getElementById("add-row-btn");
  const addFlashBtn = document.getElementById("add-flash-btn");
  const copyBtn = document.getElementById("copy-btn");
  const resetBtn = document.getElementById("reset-btn");
  const outputFrame = document.getElementById("output-frame");
  let latestOutput = { html: "", text: "" };

  const clientNameInput = document.getElementById("formula-name");
  const jobNameInput = document.getElementById("formula-age");
  const printLocationInput = document.getElementById("print-location"); // 1. GET THE NEW ELEMENT
  const dateInput = document.getElementById("formula-date");

  const easternIsoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  function formatDateForDisplay(value) {
    if (!value) {
      return "";
    }
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
      return "";
    }
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

  // Top-level option lists extracted for reuse
  // Option lists: define raw lists, sort alphabetically (case-insensitive),
  // then ensure the explicit 'other' option is moved to the end.
  const INGREDIENT_OPTIONS_RAW = [
    "yellow",
    "gold",
    "pink",
    "rubine",
    "orange",
    "black",
    "green",
    "violet",
    "process",
    "reflex",
    "agent",
    "other",
    "flo yellow",
    "flo pink",
    "flo orange",
    "flo green",
    "flo blue",
    "flo red",
    "warm red"
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

  // Helper to build a <select> and indicate if an initial value should be rendered as an "other" input
  function buildSelect(options, selectedValue = "", className = "", placeholder = "(select)") {
    let selectHtml = `<select class="${className}">`;

    const valueInOptions = options.indexOf(selectedValue) !== -1 && selectedValue !== "";

    // 1) No selectedValue provided -> show placeholder selected (disabled so can't be re-selected)
    if (!selectedValue) {
      selectHtml += `<option value="" disabled selected>${placeholder}</option>`;
      options.forEach((option) => {
        selectHtml += `<option value="${option}">${option}</option>`;
      });
      selectHtml += `</select>`;
      return { selectHtml, otherValue: "" };
    }

    // 2) selectedValue matches an option -> show placeholder (disabled) but not selected, mark option
    if (valueInOptions) {
      selectHtml += `<option value="" disabled>${placeholder}</option>`;
      options.forEach((option) => {
        selectHtml += `<option value="${option}" ${selectedValue === option ? "selected" : ""}>${option}</option>`;
      });
      selectHtml += `</select>`;
      return { selectHtml, otherValue: "" };
    }

    // 3) selectedValue provided but not in options -> select 'other' and return otherValue for input
    selectHtml += `<option value="" disabled>${placeholder}</option>`;
    options.forEach((option) => {
      selectHtml += `<option value="${option}" ${option === "other" ? "selected" : ""}>${option}</option>`;
    });
    selectHtml += `</select>`;
    return { selectHtml, otherValue: selectedValue || "" };
  }

  // Helper to get selected value or the "other" input value from a container
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
    if (!outputFrame) {
      return;
    }

    const hasContent = displayHtml && displayHtml.trim().length > 0;
    const clipboardMarkup = hasContent
      ? `<div style="font-family:'Roboto','Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.2;font-weight:400;color:#000;text-decoration:none;">${clipboardHtml}</div>`
      : "";

    latestOutput = {
      html: clipboardMarkup,
      text: hasContent ? text : ""
    };

    const displayMarkup = hasContent
      ? `<div class="line-stack">${displayHtml}</div>`
      : '<p class="empty-state">Formatted output will appear here once all required fields are complete.</p>';

    const doc = outputFrame.contentDocument || outputFrame.contentWindow?.document;
    if (!doc) {
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            :root {
              color-scheme: dark;
            }
            body {
              margin: 0;
              padding: 12px 14px;
              font-family: "Roboto", "Helvetica Neue", Arial, sans-serif;
              background: transparent;
              color: #e7fff4;
              line-height: 1.15;
            }
            .line-stack {
              display: block;
            }
            .line {
              margin: 0;
            }
            .line + .line {
              margin-top: 2px;
            }
            .line strong {
              font-weight: 700;
            }
            .empty-state {
              opacity: 0.65;
            }
            strong {
              font-weight: 700;
            }
            u {
              text-decoration-color: rgba(231, 255, 244, 0.9);
            }
          </style>
        </head>
        <body>${displayMarkup}</body>
      </html>`);
    doc.close();
  }

  function validateForm() {
    const clientName = clientNameInput.value.trim();
    const jobName = jobNameInput.value.trim();
    const printLocation = printLocationInput.value.trim(); // 2. GET ITS VALUE
    const date = dateInput.value.trim();

    if (!clientName || !jobName || !date) {
      // 3. ADD TO VALIDATION CHECK
      return false;
    }

    const rows = tableBody.querySelectorAll("tr");
    for (const row of rows) {
      if (row.dataset.type === "flash") {
        continue;
      }

      const color = row.querySelector(".color-input").value.trim();
      const baseDropdown = row.querySelector(".base-dropdown");
      let baseFilled = false;
      if (baseDropdown) {
        const baseValue = getSelectedOrOther(row, ".base-dropdown", ".base-other-input-container .other-input");
        baseFilled = baseValue.trim() !== "";
      }

      if (!color || !baseFilled) {
        return false;
      }

      const ingredientGroups = row.querySelectorAll(
        ".formula-ingredient-group"
      );
      if (ingredientGroups.length === 0) {
        return false;
      }

      for (const group of ingredientGroups) {
        const percentage = group
          .querySelector(".percentage-input")
          .value.trim();
        const ingredientDropdown = group.querySelector(".ingredient-dropdown");
        let ingredientFilled = false;
        if (ingredientDropdown) {
          const ingredientValue = getSelectedOrOther(group, ".ingredient-dropdown", ".other-input-container .other-input");
          ingredientFilled = ingredientValue.trim() !== "";
        }

        if (!percentage || !ingredientFilled) {
          return false;
        }
      }
    }
    return true;
  }

  const mobileMediaQuery = window.matchMedia("(max-width: 768px)");
  function initializeSortable() {
    if (mobileMediaQuery.matches) {
      if ($(tableBody).data("uiSortable")) {
        $(tableBody).sortable("destroy");
      }
    } else {
      if (!$(tableBody).data("uiSortable")) {
        $(tableBody).sortable({
          axis: "y",
          items: "tr",
          cursor: "move",
          placeholder: "ui-state-highlight",
          stop: () => generateOutput()
        });
      }
    }
  }
  mobileMediaQuery.addEventListener("change", initializeSortable);

  function handleOtherOption(dropdown, inputContainer, generateOutputCallback) {
    if (dropdown.value === "other") {
      inputContainer.innerHTML = `<input type="text" class="other-input">`;
      inputContainer.style.display = "block";
      // Toggle CSS classes so the dropdown becomes compact and the other-input expands
      dropdown.classList.add("compact-dropdown");
      inputContainer.classList.add("other-expanded");

      inputContainer
        .querySelector(".other-input")
        .addEventListener("input", () => {
          generateOutputCallback();
          updateCopyButtonState();
        });
    } else {
      inputContainer.innerHTML = "";
      inputContainer.style.display = "none";
      // remove classes when not 'other'
      dropdown.classList.remove("compact-dropdown");
      inputContainer.classList.remove("other-expanded");
    }
    generateOutputCallback();
    updateCopyButtonState();
  }

  function createFormulaIngredientRow(
    initialPercentage = "",
    initialIngredient = "",
    parentContainer
  ) {
    const ingredientGroup = document.createElement("div");
    ingredientGroup.className = "formula-ingredient-group";

    const {
      selectHtml: ingredientDropdownHtml,
      otherValue: initialOtherIngredientValue
    } = (function () {
      const built = buildSelect(INGREDIENT_OPTIONS, initialIngredient, "ingredient-dropdown", "(ingredient)");
      return { selectHtml: built.selectHtml, otherValue: built.otherValue };
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
    const ingredientDropdown = ingredientGroup.querySelector(
      ".ingredient-dropdown"
    );
    const otherIngredientInputContainer = ingredientGroup.querySelector(
      ".other-input-container"
    );
    const removeButton = ingredientGroup.querySelector(
      ".remove-ingredient-btn"
    );

    percentageInput.addEventListener("input", () => {
      generateOutput();
      updateCopyButtonState();
    });
    ingredientDropdown.addEventListener("change", (e) => {
      handleOtherOption(
        e.target,
        otherIngredientInputContainer,
        generateOutput
      );
    });
    // If the row was created with an initial 'other' value, ensure sizes reflect that
    if (initialOtherIngredientValue) {
      ingredientDropdown.classList.add("compact-dropdown");
      otherIngredientInputContainer.classList.add("other-expanded");
    }
    if (ingredientGroup.querySelector(".other-input")) {
      ingredientGroup
        .querySelector(".other-input")
        .addEventListener("input", () => {
          generateOutput();
          updateCopyButtonState();
        });
    }

    removeButton.addEventListener("click", () => {
      ingredientGroup.remove();
      generateOutput();
      updateCopyButtonState();
    });

    parentContainer.appendChild(ingredientGroup);
  }

  function createRow(data = {}) {
    const row = document.createElement("tr");

    const baseOptions = ["wdb", "cdb", "ez clear", "stretch", "301", "other"];
    const {
      selectHtml: baseDropdownHtml,
      otherValue: initialOtherBaseValue
    } = (function () {
      const built = buildSelect(BASE_OPTIONS, data.base || "", "base-dropdown", "(base)");
      return { selectHtml: built.selectHtml, otherValue: built.otherValue };
    })();

    row.innerHTML = `
            <td data-label="Color">
                <button class="collapse-toggle">▶</button>
                <input type="text" class="color-input" value="${
                  data.color || ""
                }">
                <div class="up-down-buttons">
                    <button class="up-down-btn up-btn">▲</button>
                    <button class="up-down-btn down-btn">▼</button>
                </div>
            </td>
            <td data-label="Base">
                ${baseDropdownHtml}
                <div class="other-input-container base-other-input-container" style="display:${
                  initialOtherBaseValue ? "block" : "none"
                };">
                    ${
                      initialOtherBaseValue
                        ? `<input type="text" class="other-input" value="${initialOtherBaseValue}" placeholder="Enter base name...">`
                        : ""
                    }
                </div>
            </td>
            <td data-label="Formula">
                <div class="formula-ingredients-container"></div>
            </td>
            <td data-label="Actions">
                <button type="button" class="add-ingredient-btn">Add Ingredient</button>
                <button class="delete-btn">Delete Color</button>
            </td>
        `;

    const collapseToggle = row.querySelector(".collapse-toggle");
    const baseDropdown = row.querySelector(".base-dropdown");
    const otherBaseInputContainer = row.querySelector(
      ".base-other-input-container"
    );
    const formulaIngredientsContainer = row.querySelector(
      ".formula-ingredients-container"
    );
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
      if (prevRow) {
        $(row).insertBefore(prevRow);
        generateOutput();
      }
    });

    downBtn.addEventListener("click", () => {
      const nextRow = row.nextElementSibling;
      if (nextRow) {
        $(row).insertAfter(nextRow);
        generateOutput();
      }
    });

    baseDropdown.addEventListener("change", (e) => {
      handleOtherOption(e.target, otherBaseInputContainer, generateOutput);
    });
    if (row.querySelector(".base-other-input-container .other-input")) {
      row
        .querySelector(".base-other-input-container .other-input")
        .addEventListener("input", () => {
          generateOutput();
          updateCopyButtonState();
        });
    }

    // If base was created with an initial 'other' value, adjust sizing so the other-input gets more space
    if (initialOtherBaseValue) {
      baseDropdown.classList.add("compact-dropdown");
      otherBaseInputContainer.classList.add("other-expanded");
    }

    addIngredientBtn.addEventListener("click", () => {
      createFormulaIngredientRow("", "", formulaIngredientsContainer);
      generateOutput();
      updateCopyButtonState();
    });

    row.querySelector(".delete-btn").addEventListener("click", () => {
      row.remove();
      generateOutput();
      updateCopyButtonState();
    });

    colorInput.addEventListener("input", () => {
      generateOutput();
      updateCopyButtonState();
    });

    if (
      data.formula &&
      Array.isArray(data.formula) &&
      data.formula.length > 0
    ) {
      data.formula.forEach((ingredient) => {
        createFormulaIngredientRow(
          ingredient.percentage,
          ingredient.ingredient,
          formulaIngredientsContainer
        );
      });
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
            <button class="collapse-toggle">▶</button>
            <span class="color-text">FLASH</span>
            <div class="up-down-buttons">
                <button class="up-down-btn up-btn">▲</button>
                <button class="up-down-btn down-btn">▼</button>
            </div>
          </td>
          <td data-label="Base"></td>
          <td data-label="Formula"></td>
          <td data-label="Actions">
              <button class="delete-btn">Delete Flash</button>
          </td>
      `;

    const collapseToggle = row.querySelector(".collapse-toggle");
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
      if (prevRow) {
        $(row).insertBefore(prevRow);
        generateOutput();
      }
    });

    downBtn.addEventListener("click", () => {
      const nextRow = row.nextElementSibling;
      if (nextRow) {
        $(row).insertAfter(nextRow);
        generateOutput();
      }
    });

    row.querySelector(".delete-btn").addEventListener("click", () => {
      row.remove();
      generateOutput();
      updateCopyButtonState();
    });

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
      if (row.dataset.type === "flash") {
        colorOrder.push("flash");
        return;
      }

      const colorInput = row.querySelector(".color-input");
      const colorValue = colorInput ? colorInput.value.trim() : "";
      if (colorValue) {
        colorOrder.push(colorValue.toLowerCase());
      }
    });

    const displayLines = [];
    const clipboardLines = [];
    const textLines = [];

    const pushLine = (displayHtml, clipboardHtml, textContent) => {
      if (!textContent) {
        return;
      }
      displayLines.push(`<div class="line">${displayHtml}</div>`);
      clipboardLines.push(
        `<p style="margin:0 0 2px 0;font-weight:normal;text-decoration:none;">${clipboardHtml}</p>`
      );
      textLines.push(textContent);
    };

    if (clientName) {
      pushLine(
        `<strong><u>${escapeHtml(clientName)}</u></strong>`,
        `<b><u>${escapeHtml(clientName)}</u></b>`,
        clientName
      );
    }

    if (jobName || date) {
      const formattedDate = formatDateForDisplay(date);
      let jobLineHtml = "";
      let jobLineText = "";

      if (jobName) {
        jobLineHtml += `<strong>${escapeHtml(jobName)}</strong>`;
        jobLineText += jobName;
      }

      if (formattedDate) {
        const prefix = jobLineHtml ? " " : "";
        const textPrefix = jobLineText ? " " : "";
        jobLineHtml += `${prefix}(${escapeHtml(formattedDate)})`;
        jobLineText += `${textPrefix}(${formattedDate})`;
      }

      if (jobLineHtml) {
        const clipboardJobHtml = [
          jobName ? `<b>${escapeHtml(jobName)}</b>` : "",
          formattedDate
            ? `<span style="font-weight:normal;text-decoration:none;"> (${escapeHtml(formattedDate)})</span>`
            : ""
        ].join("");

        pushLine(jobLineHtml, clipboardJobHtml, jobLineText);
      }
    }

    if (printLocation) {
      pushLine(
        escapeHtml(printLocation),
        `<span style="font-weight:normal;text-decoration:none;">${escapeHtml(printLocation)}</span>`,
        printLocation
      );
    }

    if (colorOrder.length > 1) {
      pushLine(
        `color order: ${escapeHtml(colorOrder.join(" / "))}`,
        `<span style="font-weight:normal;text-decoration:none;">color order: ${escapeHtml(colorOrder.join(" / "))}</span>`,
        `color order: ${colorOrder.join(" / ")}`
      );
    }

    rows.forEach((row) => {
      if (row.dataset.type === "flash") {
        return;
      }

      const colorInput = row.querySelector(".color-input");
      const colorValueRaw = colorInput ? colorInput.value.trim() : "";
      const colorValue = colorValueRaw.toLowerCase();
      if (!colorValue) {
        return;
      }

      const baseDropdown = row.querySelector(".base-dropdown");
      let base = "";

      if (baseDropdown) {
        base = getSelectedOrOther(row, ".base-dropdown", ".base-other-input-container .other-input");
      }

      const formulaIngredients = [];
      const ingredientGroups = row.querySelectorAll(
        ".formula-ingredient-group"
      );
      ingredientGroups.forEach((group) => {
        const percentageInput = group.querySelector(".percentage-input");
        const percentage = percentageInput ? percentageInput.value.trim() : "";
        const ingredientDropdown = group.querySelector(".ingredient-dropdown");
        let ingredient = "";

        if (ingredientDropdown) {
          ingredient = getSelectedOrOther(group, ".ingredient-dropdown", ".other-input-container .other-input");
        }

        if (percentage || ingredient) {
          formulaIngredients.push(`${percentage}% ${ingredient}`.trim());
        }
      });

      const baseText = base ? base.toLowerCase() : "";
      const formulaText = formulaIngredients
        .map((item) => item.toLowerCase())
        .join(" / ");

      const textSegments = [colorValue];
      const htmlSegments = [`<strong>${escapeHtml(colorValue)}</strong>`];

      if (baseText) {
        textSegments.push(baseText);
        htmlSegments.push(escapeHtml(baseText));
      }
      if (formulaText) {
        textSegments.push(formulaText);
        htmlSegments.push(escapeHtml(formulaText));
      }

      const lineText = textSegments.join(" - ");
      const lineHtml = htmlSegments.join(" - ");
      const clipboardLineParts = [`<b>${escapeHtml(colorValue)}</b>`];
      if (baseText) {
        clipboardLineParts.push(
          `<span style="font-weight:normal;text-decoration:none;"> - ${escapeHtml(baseText)}</span>`
        );
      }
      if (formulaText) {
        clipboardLineParts.push(
          `<span style="font-weight:normal;text-decoration:none;"> - ${escapeHtml(formulaText)}</span>`
        );
      }
      const clipboardLine = clipboardLineParts.join("");

      pushLine(lineHtml, clipboardLine, lineText);
    });

    const displayHtml = displayLines.join("");
    const clipboardHtml = clipboardLines.join("");
    const textOutput = textLines.join("\n");

    setOutputContent(displayHtml, textOutput, clipboardHtml);
  }

  function updateCopyButtonState() {
    copyBtn.disabled = !validateForm();
  }

  addRowBtn.textContent = "Add Color";

  addFlashBtn.addEventListener("click", () => {
    createFlashRow();
    initializeSortable();
    generateOutput();
    updateCopyButtonState();
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clientNameInput.value = "";
      jobNameInput.value = "";
      printLocationInput.value = "";
      dateInput.value = easternIsoFormatter.format(new Date());

      // Clear table and create a single empty row
      tableBody.innerHTML = "";
      createRow();
      initializeSortable();

      generateOutput();
      updateCopyButtonState();
    });
  }

  const initialData = [];

  initialData.forEach((data) => createRow(data));
  if (initialData.length === 0) {
    createRow();
  }
  generateOutput();
  updateCopyButtonState();

  addRowBtn.addEventListener("click", () => {
    createRow();
    initializeSortable();
    generateOutput();
    updateCopyButtonState();
  });

  copyBtn.addEventListener("click", async () => {
    if (!latestOutput.html) {
      return;
    }

    const htmlForClipboard = latestOutput.html || "";

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.write === "function" &&
        typeof ClipboardItem !== "undefined"
      ) {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([htmlForClipboard], { type: "text/html" }),
          "text/plain": new Blob([latestOutput.text], { type: "text/plain" })
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (error) {
      const fallbackTextarea = document.createElement("textarea");
      fallbackTextarea.value = latestOutput.text;
      fallbackTextarea.setAttribute("readonly", "");
      fallbackTextarea.style.position = "absolute";
      fallbackTextarea.style.left = "-9999px";
      document.body.appendChild(fallbackTextarea);
      fallbackTextarea.select();
      document.execCommand("copy");
      document.body.removeChild(fallbackTextarea);
    }

    alert("Ink formula copied to clipboard!");
  });

  clientNameInput.addEventListener("input", () => {
    generateOutput();
    updateCopyButtonState();
  });
  jobNameInput.addEventListener("input", () => {
    generateOutput();
    updateCopyButtonState();
  });
  // 6. ADD EVENT LISTENER FOR THE NEW INPUT
  printLocationInput.addEventListener("input", () => {
    generateOutput();
    updateCopyButtonState();
  });
  dateInput.addEventListener("input", () => {
    generateOutput();
    updateCopyButtonState();
  });

  initializeSortable();
});
