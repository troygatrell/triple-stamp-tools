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
