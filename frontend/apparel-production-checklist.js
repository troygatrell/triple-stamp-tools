function resetChecklist() {
    // Reset all checklist item checkboxes
    const itemCheckboxes = document.querySelectorAll('.checklist-items input[type="checkbox"]');
    itemCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Reset all section toggle checkboxes
    const sectionCheckboxes = document.querySelectorAll('.section-toggle');
    sectionCheckboxes.forEach(checkbox => {
        checkbox.checked = false;

        // Also ensure all checklist items are visible again
        const checklistItems = checkbox.parentElement.querySelector('.checklist-items');
        checklistItems.style.display = 'block';
    });

    // Re-apply the event listeners for section toggling
    applySectionToggleListeners();
}

// Function to apply section toggle listeners
function applySectionToggleListeners() {
    document.querySelectorAll('.section-toggle').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const checklistItems = this.parentElement.querySelector('.checklist-items');
            if (this.checked) {
                checklistItems.style.display = 'none';
            } else {
                checklistItems.style.display = 'block';
            }
        });
    });
}

// Apply listeners on page load
applySectionToggleListeners();

// Team mode toggle support
const checklistSection = document.getElementById('apparel-production-checklist');
const teamModeButton = document.getElementById('teamModeButton');
const soloModeButton = document.getElementById('soloModeButton');
let isTeamModeActive = false;
const checklistLists = Array.from(
    document.querySelectorAll('#apparel-production-checklist .checklist-items')
);
const sectionLayouts = new Map();

function createTeamLayoutForSection(listElement) {
    if (sectionLayouts.has(listElement)) {
        return sectionLayouts.get(listElement);
    }

    const taskItems = Array.from(
        listElement.querySelectorAll('li:not(.worker-heading)')
    );
    const soloOrder = taskItems
        .map(item => ({
            order: Number(item.getAttribute('data-order-solo') || '0'),
            element: item
        }))
        .sort((a, b) => a.order - b.order)
        .map(entry => entry.element);

    const container = document.createElement('div');
    container.className = 'worker-columns';
    container.setAttribute('aria-hidden', 'true');

    const columnA = document.createElement('div');
    columnA.className = 'worker-column worker-column-a';
    const headingA = document.createElement('div');
    headingA.className = 'worker-heading';
    headingA.textContent = 'Worker A';
    const listA = document.createElement('ul');
    listA.className = 'worker-task-list';
    columnA.append(headingA, listA);

    const columnB = document.createElement('div');
    columnB.className = 'worker-column worker-column-b';
    const headingB = document.createElement('div');
    headingB.className = 'worker-heading';
    headingB.textContent = 'Worker B';
    const listB = document.createElement('ul');
    listB.className = 'worker-task-list';
    columnB.append(headingB, listB);

    container.append(columnA, columnB);
    listElement.insertAdjacentElement('afterend', container);

    const layout = {
        listElement,
        soloOrder,
        container,
        listA,
        listB
    };

    sectionLayouts.set(listElement, layout);
    return layout;
}

function applyTeamLayouts() {
    checklistLists.forEach(listElement => {
        const layout = createTeamLayoutForSection(listElement);
        layout.listA.innerHTML = '';
        layout.listB.innerHTML = '';

        layout.soloOrder.forEach(item => {
            if (item.classList.contains('worker-b')) {
                layout.listB.appendChild(item);
            } else {
                layout.listA.appendChild(item);
            }
        });

        listElement.style.display = 'none';
        layout.container.classList.add('active');
    });
}

function applySoloLayouts() {
    checklistLists.forEach(listElement => {
        const layout = createTeamLayoutForSection(listElement);
        layout.container.classList.remove('active');
        listElement.style.display = '';

        layout.soloOrder.forEach(item => {
            listElement.appendChild(item);
        });
    });
}

function applyModeClasses(isTeamMode) {
    if (!checklistSection) {
        return;
    }
    checklistSection.classList.toggle('team-mode', isTeamMode);
    checklistSection.classList.toggle('solo-mode', !isTeamMode);
}

function syncToggleButtons(isTeamMode) {
    if (!teamModeButton || !soloModeButton) {
        return;
    }
    teamModeButton.classList.toggle('active', isTeamMode);
    soloModeButton.classList.toggle('active', !isTeamMode);
}

function setTeamMode(isTeamMode) {
    isTeamModeActive = isTeamMode;
    applyModeClasses(isTeamMode);
    syncToggleButtons(isTeamMode);
    if (isTeamMode) {
        applyTeamLayouts();
    } else {
        applySoloLayouts();
    }
}

if (teamModeButton && soloModeButton && checklistSection) {
    teamModeButton.addEventListener('click', () => {
        setTeamMode(true);
    });

    soloModeButton.addEventListener('click', () => {
        setTeamMode(false);
    });

    setTeamMode(false);
}
