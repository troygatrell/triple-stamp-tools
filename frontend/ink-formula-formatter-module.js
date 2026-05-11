// frontend/ink-formula-formatter-module.js - Refactored into a reusable module

const InkFormulaFormatter = (function () {
    const INGREDIENT_OPTIONS_RAW = [
        "yellow", "gold", "pink", "rubine", "orange", "black", "green", "violet", "process", "reflex", "agent", "other",
        "flo yellow", "flo pink", "flo orange", "flo green", "flo blue", "flo red", "warm red"
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

    const easternIsoFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    let currentConfig = {};
    let latestOutput = { html: "", text: "" };
    let formatterDomElement;
    let tableBody;
    let clientNameInput;
    let jobNameInput;
    let printLocationInput;
    let dateInput;

    // Helper to build a <select> and indicate if an initial value should be rendered as an "other" input
    function buildSelect(options, selectedValue = "", className = "", placeholder = "(select)") {
        let selectHtml = `<select class="${className}">`;

        const valueInOptions = options.indexOf(selectedValue) !== -1 && selectedValue !== "";

        if (!selectedValue) {
            selectHtml += `<option value="" disabled selected>${placeholder}</option>`;
            options.forEach((option) => {
                selectHtml += `<option value="${option}">${option}</option>`;
            });
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

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

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

    function setOutputContent(displayHtml, text, clipboardHtml) {
        const outputFrame = formatterDomElement.querySelector("#output-frame");
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
        const printLocation = printLocationInput.value.trim();
        const date = dateInput.value.trim();

        if (!clientName || !jobName || !date) {
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

            const ingredientGroups = row.querySelectorAll(".formula-ingredient-group");
            if (ingredientGroups.length === 0) {
                return false;
            }

            for (const group of ingredientGroups) {
                const percentage = group.querySelector(".percentage-input").value.trim();
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
                    stop: () => { generateOutput(); if (currentConfig.onChange) currentConfig.onChange(); }
                });
            }
        }
    }

    function handleOtherOption(dropdown, inputContainer, generateOutputCallback) {
        if (dropdown.value === "other") {
            inputContainer.innerHTML = `<input type="text" class="other-input">`;
            inputContainer.style.display = "block";
            dropdown.classList.add("compact-dropdown");
            inputContainer.classList.add("other-expanded");

            inputContainer.querySelector(".other-input").addEventListener("input", () => {
                generateOutputCallback();
                if (currentConfig.onChange) currentConfig.onChange();
            });
        } else {
            inputContainer.innerHTML = "";
            inputContainer.style.display = "none";
            dropdown.classList.remove("compact-dropdown");
            inputContainer.classList.remove("other-expanded");
        }
        generateOutputCallback();
        if (currentConfig.onChange) currentConfig.onChange();
    }

    function createFormulaIngredientRow(initialPercentage = "", initialIngredient = "", parentContainer) {
        const ingredientGroup = document.createElement("div");
        ingredientGroup.className = "formula-ingredient-group";

        const { selectHtml: ingredientDropdownHtml, otherValue: initialOtherIngredientValue } = buildSelect(INGREDIENT_OPTIONS, initialIngredient, "ingredient-dropdown", "(ingredient)");

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

        percentageInput.addEventListener("input", () => { generateOutput(); if (currentConfig.onChange) currentConfig.onChange(); });
        ingredientDropdown.addEventListener("change", (e) => {
            handleOtherOption(e.target, otherIngredientInputContainer, generateOutput);
        });
        if (initialOtherIngredientValue) {
            ingredientDropdown.classList.add("compact-dropdown");
            otherIngredientInputContainer.classList.add("other-expanded");
        }
        if (ingredientGroup.querySelector(".other-input")) {
            ingredientGroup.querySelector(".other-input").addEventListener("input", () => {
                generateOutput();
                if (currentConfig.onChange) currentConfig.onChange();
            });
        }

        removeButton.addEventListener("click", () => {
            ingredientGroup.remove();
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        parentContainer.appendChild(ingredientGroup);
    }

    function createRow(data = {}) {
        const row = document.createElement("tr");

        const { selectHtml: baseDropdownHtml, otherValue: initialOtherBaseValue } = buildSelect(BASE_OPTIONS, data.base || "", "base-dropdown", "(base)");

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
            const prevRow = $(row).prev("tr");
            if (prevRow.length) {
                $(row).insertBefore(prevRow);
                generateOutput();
                if (currentConfig.onChange) currentConfig.onChange();
            }
        });

        downBtn.addEventListener("click", () => {
            const nextRow = $(row).next("tr");
            if (nextRow.length) {
                $(row).insertAfter(nextRow);
                generateOutput();
                if (currentConfig.onChange) currentConfig.onChange();
            }
        });

        baseDropdown.addEventListener("change", (e) => {
            handleOtherOption(e.target, otherBaseInputContainer, generateOutput);
        });
        if (row.querySelector(".base-other-input-container .other-input")) {
            row.querySelector(".base-other-input-container .other-input").addEventListener("input", () => {
                generateOutput();
                if (currentConfig.onChange) currentConfig.onChange();
            });
        }

        if (initialOtherBaseValue) {
            baseDropdown.classList.add("compact-dropdown");
            otherBaseInputContainer.classList.add("other-expanded");
        }

        addIngredientBtn.addEventListener("click", () => {
            createFormulaIngredientRow("", "", formulaIngredientsContainer);
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        row.querySelector(".delete-btn").addEventListener("click", () => {
            row.remove();
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        colorInput.addEventListener("input", () => {
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        if (data.ingredients && Array.isArray(data.ingredients) && data.ingredients.length > 0) {
            data.ingredients.forEach((ingredient) => {
                createFormulaIngredientRow(ingredient.percentage, ingredient.ingredient, formulaIngredientsContainer);
            });
        } else {
            createFormulaIngredientRow("", "", formulaIngredientsContainer);
        }

        tableBody.appendChild(row);
        return row;
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
            const prevRow = $(row).prev("tr");
            if (prevRow.length) {
                $(row).insertBefore(prevRow);
                generateOutput();
                if (currentConfig.onChange) currentConfig.onChange();
            }
        });

        downBtn.addEventListener("click", () => {
            const nextRow = $(row).next("tr");
            if (nextRow.length) {
                $(row).insertAfter(nextRow);
                generateOutput();
                if (currentConfig.onChange) currentConfig.onChange();
            }
        });

        row.querySelector(".delete-btn").addEventListener("click", () => {
            row.remove();
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        tableBody.appendChild(row);
        return row;
    }

    function generateOutput() {
        const clientName = clientNameInput.value.trim();
        const jobName = jobNameInput.value.trim();
        const printLocation = printLocationInput.value.trim();
        const date = dateInput.value.trim();

        const rows = Array.from(tableBody.querySelectorAll("tr"));
        const colorOrder = [];
        const structuredFormula = [];

        rows.forEach((row) => {
            if (row.dataset.type === "flash") {
                colorOrder.push("flash");
                structuredFormula.push({ type: "flash" });
                return;
            }

            const colorInput = row.querySelector(".color-input");
            const colorValueRaw = colorInput ? colorInput.value.trim() : "";
            const colorValue = colorValueRaw.toLowerCase();
            if (!colorValue) {
                return;
            }

            colorOrder.push(colorValue.toLowerCase());

            const base = getSelectedOrOther(row, ".base-dropdown", ".base-other-input-container .other-input");
            const ingredients = [];
            const ingredientGroups = row.querySelectorAll(".formula-ingredient-group");
            ingredientGroups.forEach((group) => {
                const percentage = group.querySelector(".percentage-input").value.trim();
                const ingredient = getSelectedOrOther(group, ".ingredient-dropdown", ".other-input-container .other-input");

                if (percentage || ingredient) {
                    ingredients.push({ percentage, ingredient });
                }
            });

            structuredFormula.push({
                type: "color",
                color: colorValueRaw,
                base: base,
                ingredients: ingredients
            });
        });

        const displayLines = [];
        const clipboardLines = [];
        const textLines = [];

        const pushLine = (displayHtml, clipboardHtml, textContent) => {
            if (!textContent) return;
            displayLines.push(`<div class="line">${displayHtml}</div>`);
            clipboardLines.push(`<p style="margin:0 0 2px 0;font-weight:normal;text-decoration:none;">${clipboardHtml}</p>`);
            textLines.push(textContent);
        };

        if (clientName) {
            pushLine(`<strong><u>${escapeHtml(clientName)}</u></strong>`, `<b><u>${escapeHtml(clientName)}</u></b>`, clientName);
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
                    formattedDate ? `<span style="font-weight:normal;text-decoration:none;"> (${escapeHtml(formattedDate)})</span>` : ""
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

        structuredFormula.forEach(item => {
            if (item.type === "color") {
                const colorValue = item.color;
                const baseText = item.base ? item.base.toLowerCase() : "";
                const formulaText = item.ingredients
                    .map(ing => `${ing.percentage}% ${ing.ingredient}`.toLowerCase())
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
            }
        });


        const displayHtml = displayLines.join("");
        const clipboardHtml = clipboardLines.join("");
        const textOutput = textLines.join("
");

        setOutputContent(displayHtml, textOutput, clipboardHtml);

        // Store the generated output in latestOutput, which is used by getData()
        latestOutput.displayHtml = displayHtml;
        latestOutput.displayText = textOutput;
        latestOutput.structuredFormula = structuredFormula;
    }

    function setupEventListeners() {
        mobileMediaQuery.addEventListener("change", initializeSortable);

        formatterDomElement.querySelector("#add-row-btn").addEventListener("click", () => {
            createRow();
            initializeSortable();
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        formatterDomElement.querySelector("#add-flash-btn").addEventListener("click", () => {
            createFlashRow();
            initializeSortable();
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        formatterDomElement.querySelector("#reset-btn").addEventListener("click", () => {
            reset();
            if (currentConfig.onChange) currentConfig.onChange();
        });

        clientNameInput.addEventListener("input", () => { generateOutput(); if (currentConfig.onChange) currentConfig.onChange(); });
        jobNameInput.addEventListener("input", () => { generateOutput(); if (currentConfig.onChange) currentConfig.onChange(); });
        printLocationInput.addEventListener("input", () => { generateOutput(); if (currentConfig.onChange) currentConfig.onChange(); });
        dateInput.addEventListener("input", () => { generateOutput(); if (currentConfig.onChange) currentConfig.onChange(); });
    }

    class Formatter {
        constructor(containerElement, config = {}) {
            formatterDomElement = containerElement;
            currentConfig = config; // Store callbacks like onChange

            // Inject the HTML structure of the formatter
            formatterDomElement.innerHTML = `
                <div class="formatter-controls">
                    <div class="metadata-inputs">
                        <label for="formula-name">Client/Job Name:</label>
                        <input type="text" id="formula-name" placeholder="Enter Client or Job Name">
                        <label for="formula-age">Job Number/PO:</label>
                        <input type="text" id="formula-age" placeholder="Enter Job Number or PO">
                        <label for="print-location">Print Location:</label>
                        <input type="text" id="print-location" placeholder="Enter Print Location">
                        <label for="formula-date">Date:</label>
                        <input type="date" id="formula-date">
                    </div>
                    <div class="action-buttons">
                        <button id="add-row-btn">Add Color</button>
                        <button id="add-flash-btn">Add Flash</button>
                        <button id="reset-btn">Reset Form</button>
                    </div>
                </div>

                <div class="formula-table-container">
                    <table id="formula-table">
                        <thead>
                            <tr>
                                <th>Color</th>
                                <th>Base</th>
                                <th>Formula</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Rows will be added here -->
                        </tbody>
                    </table>
                </div>

                <div class="output-section">
                    <h3>Formatted Output Preview:</h3>
                    <iframe id="output-frame" frameborder="0"></iframe>
                    <button id="copy-btn">Copy to Clipboard</button>
                </div>
            `;

            tableBody = formatterDomElement.querySelector("#formula-table tbody");
            clientNameInput = formatterDomElement.querySelector("#formula-name");
            jobNameInput = formatterDomElement.querySelector("#formula-age");
            printLocationInput = formatterDomElement.querySelector("#print-location");
            dateInput = formatterDomElement.querySelector("#formula-date");

            if (dateInput && !dateInput.value) {
                dateInput.value = easternIsoFormatter.format(new Date());
            }

            setupEventListeners();
            initializeSortable();

            // Handle copy to clipboard button
            formatterDomElement.querySelector("#copy-btn").addEventListener("click", async () => {
                if (!latestOutput.html) {
                    return;
                }
                const htmlForClipboard = latestOutput.html || "";
                try {
                    if (navigator.clipboard && typeof navigator.clipboard.write === "function" && typeof ClipboardItem !== "undefined") {
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
            // this.reset();
        }

        setData(data) {
            clientNameInput.value = data.formulaName || "";
            jobNameInput.value = data.jobName || "";
            printLocationInput.value = data.printLocation || "";
            dateInput.value = data.date || easternIsoFormatter.format(new Date());

            tableBody.innerHTML = ""; // Clear existing rows

            if (data.structuredFormula && Array.isArray(data.structuredFormula)) {
                data.structuredFormula.forEach(item => {
                    if (item.type === "color") {
                        createRow({
                            color: item.color,
                            base: item.base,
                            ingredients: item.ingredients.map(ing => ({
                                percentage: ing.percentage,
                                ingredient: ing.ingredient
                            }))
                        });
                    } else if (item.type === "flash") {
                        createFlashRow();
                    }
                });
            }

            if (tableBody.children.length === 0) {
                createRow(); // Ensure at least one color row if no data
            }

            generateOutput();
            initializeSortable();
        }

        getData() {
            generateOutput(); // Ensure output is fresh before getting data
            return {
                formulaName: clientNameInput.value.trim(),
                jobName: jobNameInput.value.trim(),
                printLocation: printLocationInput.value.trim(),
                date: dateInput.value.trim(),
                structuredFormula: latestOutput.structuredFormula,
                displayHtml: latestOutput.displayHtml,
                displayText: latestOutput.displayText
            };
        }

        reset() {
            clientNameInput.value = "";
            jobNameInput.value = "";
            printLocationInput.value = "";
            dateInput.value = easternIsoFormatter.format(new Date());

            tableBody.innerHTML = "";
            createRow(); // Start with one empty color row
            generateOutput();
            if (currentConfig.onChange) currentConfig.onChange();
        }

        isValid() {
          return validateForm();
        }
    }

    return Formatter;
})();
