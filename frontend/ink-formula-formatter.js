document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#formula-table tbody");
  const addRowBtn = document.getElementById("add-row-btn");
  const addFlashBtn = document.getElementById("add-flash-btn");
  const copyBtn = document.getElementById("copy-btn");
  const outputTextarea = document.getElementById("output-text");

  const clientNameInput = document.getElementById("formula-name");
  const jobNameInput = document.getElementById("formula-age");
  const printLocationInput = document.getElementById("print-location"); // 1. GET THE NEW ELEMENT
  const dateInput = document.getElementById("formula-date");

  function validateForm() {
    const clientName = clientNameInput.value.trim();
    const jobName = jobNameInput.value.trim();
    const printLocation = printLocationInput.value.trim(); // 2. GET ITS VALUE
    const date = dateInput.value.trim();

    if (!clientName || !jobName || !printLocation || !date) {
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
        if (baseDropdown.value === "other") {
          const otherInput = row.querySelector(
            ".base-other-input-container .other-input"
          );
          baseFilled = otherInput && otherInput.value.trim() !== "";
        } else {
          baseFilled = baseDropdown.value !== "";
        }
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
          if (ingredientDropdown.value === "other") {
            const otherInput = group.querySelector(
              ".other-input-container .other-input"
            );
            ingredientFilled = otherInput && otherInput.value.trim() !== "";
          } else {
            ingredientFilled = ingredientDropdown.value !== "";
          }
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
      inputContainer.innerHTML = `<input type="text" class="other-input" placeholder="Enter custom name...">`;
      inputContainer.style.display = "block";
      inputContainer
        .querySelector(".other-input")
        .addEventListener("input", () => {
          generateOutputCallback();
          updateCopyButtonState();
        });
    } else {
      inputContainer.innerHTML = "";
      inputContainer.style.display = "none";
    }
    generateOutputCallback();
    updateCopyButtonState();
  }

  function createFormulaIngredientRow(
    initialPercentage = "",
    initialIngredient = "",
    parentContainer
  ) {
    const ingredientOptions = [
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
      "other"
    ];

    const ingredientGroup = document.createElement("div");
    ingredientGroup.className = "formula-ingredient-group";

    let ingredientDropdownHtml = `<select class="ingredient-dropdown">`;
    ingredientDropdownHtml += `<option value="" disabled selected>(select ingredient)</option>`;
    ingredientOptions.forEach((option) => {
      ingredientDropdownHtml += `<option value="${option}" ${
        initialIngredient === option ? "selected" : ""
      }>${option}</option>`;
    });
    ingredientDropdownHtml += `</select>`;

    let initialOtherIngredientValue = "";
    if (
      ingredientOptions.indexOf(initialIngredient) === -1 &&
      initialIngredient
    ) {
      ingredientDropdownHtml = `<select class="ingredient-dropdown">`;
      ingredientDropdownHtml += `<option value="" disabled>(select one)</option>`;
      ingredientOptions.forEach((option) => {
        ingredientDropdownHtml += `<option value="${option}" ${
          option === "other" ? "selected" : ""
        }>${option}</option>`;
      });
      ingredientDropdownHtml += `</select>`;
      initialOtherIngredientValue = initialIngredient;
    }

    ingredientGroup.innerHTML = `
            <input type="number" class="percentage-input" value="${initialPercentage}" min="0" step="0.1" pattern="[0-9]*[.]?[0-9]+" placeholder="%" title="Numbers only">
            ${ingredientDropdownHtml}
            <div class="other-input-container" style="display:${
              initialOtherIngredientValue ? "block" : "none"
            };">
                ${
                  initialOtherIngredientValue
                    ? `<input type="text" class="other-input" value="${initialOtherIngredientValue}" placeholder="Enter ingredient name...">`
                    : ""
                }
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

    let baseDropdownHtml = `<select class="base-dropdown">`;
    baseDropdownHtml += `<option value="" disabled selected>(select base)</option>`;
    baseOptions.forEach((option) => {
      baseDropdownHtml += `<option value="${option}" ${
        data.base === option ? "selected" : ""
      }>${option}</option>`;
    });
    baseDropdownHtml += `</select>`;

    let initialOtherBaseValue = "";
    if (baseOptions.indexOf(data.base) === -1 && data.base) {
      baseDropdownHtml = `<select class="base-dropdown">`;
      baseDropdownHtml += `<option value="" disabled>(select one)</option>`;
      baseOptions.forEach((option) => {
        baseDropdownHtml += `<option value="${option}" ${
          option === "other" ? "selected" : ""
        }>${option}</option>`;
      });
      baseDropdownHtml += `</select>`;
      initialOtherBaseValue = data.base;
    }

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
    let output = "";

    const clientName = clientNameInput.value.trim();
    const jobName = jobNameInput.value.trim();
    const printLocation = printLocationInput.value.trim(); // 4. GET ITS VALUE AGAIN
    const date = dateInput.value.trim();

    if (clientName && jobName && printLocation && date) {
      // 5. UPDATE THE OUTPUT LINE
      output += `${clientName} - ${jobName} - ${date}\n`;
    }

    output += `--------------------------------------------------------------\n`;
    output += `${printLocation.toUpperCase()}\n`;
    const colorOrder = [];
    const rows = tableBody.querySelectorAll("tr");
    rows.forEach((row) => {
      if (row.dataset.type === "flash") {
        colorOrder.push("FLASH");
      } else {
        const color = row.querySelector(".color-input").value.trim();
        if (color) {
          colorOrder.push(color);
        }
      }
    });

    output += "color order: " + colorOrder.join(" / ") + "\n";

    output += `--------------------------------------------------------------\n`;

    rows.forEach((row) => {
      if (row.dataset.type === "flash") {
        return;
      }

      const color = row.querySelector(".color-input").value.trim();
      const baseDropdown = row.querySelector(".base-dropdown");
      let base = "";

      if (baseDropdown) {
        if (baseDropdown.value === "other") {
          const otherInput = row.querySelector(
            ".base-other-input-container .other-input"
          );
          base = otherInput ? otherInput.value.trim() : "";
        } else {
          base = baseDropdown.value.trim();
        }
      }

      const formulaIngredients = [];
      const ingredientGroups = row.querySelectorAll(
        ".formula-ingredient-group"
      );
      ingredientGroups.forEach((group) => {
        const percentage = group
          .querySelector(".percentage-input")
          .value.trim();
        const ingredientDropdown = group.querySelector(".ingredient-dropdown");
        let ingredient = "";

        if (ingredientDropdown) {
          if (ingredientDropdown.value === "other") {
            const otherIngredientInput = group.querySelector(
              ".other-input-container .other-input"
            );
            ingredient = otherIngredientInput
              ? otherIngredientInput.value.trim()
              : "";
          } else {
            ingredient = ingredientDropdown.value.trim();
          }
        }

        if (percentage || ingredient) {
          formulaIngredients.push(`${percentage}% ${ingredient}`);
        }
      });
      const formattedFormula = formulaIngredients.join(" / ");

      if (color) {
        let line = `${color.toLowerCase()}\t\t${base.toLowerCase()}`;

        if (base === "cdb" || base === "wdb") {
          line += `\t\t`;
        } else {
          line += `\t`;
        }

        line += formattedFormula.toLowerCase();
        output += line + "\n";
      }
    });

    outputTextarea.value = output;
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

  copyBtn.addEventListener("click", () => {
    outputTextarea.select();
    document.execCommand("copy");
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
