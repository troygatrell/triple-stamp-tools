document.addEventListener('DOMContentLoaded', () => {
    const resetChecklistButton = document.getElementById('reset-checklist-button');

    // Handle section toggles to collapse or expand items
    const sectionToggles = document.querySelectorAll('.section-toggle');
    sectionToggles.forEach(toggle => {
        toggle.addEventListener('change', (event) => {
            const checklistItems = event.target.parentElement.nextElementSibling;
            if (event.target.checked) {
                checklistItems.style.display = 'none'; // Collapse items
            } else {
                checklistItems.style.display = 'block'; // Expand items
            }
        });
    });

    // Reset the checklist
    resetChecklistButton.addEventListener('click', () => {
        console.log('Reset Checklist button clicked');

        // Uncheck all section toggles and expand all items
        sectionToggles.forEach(toggle => {
            toggle.checked = false;
            const checklistItems = toggle.parentElement.nextElementSibling;
            checklistItems.style.display = 'block'; // Show all checklist items
        });

        // Uncheck all item checkboxes
        const checkboxes = document.querySelectorAll('.checklist-items input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false; // Uncheck all items
        });
    });
});
