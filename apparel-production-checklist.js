document.addEventListener('DOMContentLoaded', () => {
    const checklist = document.getElementById('checklist');
    const resetChecklistButton = document.getElementById('reset-checklist-button');

    if (!resetChecklistButton) {
        console.error('Reset Checklist button not found!');
        return;
    }

    console.log('Reset Checklist button found');

    // Handle item checking
    checklist.addEventListener('change', (event) => {
        if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') {
            const listItem = event.target.parentElement;
            if (event.target.checked) {
                console.log('Item checked:', listItem.textContent.trim());
                listItem.style.display = 'none'; // Hide the item when checked
            }
        }
    });

    // Reset the checklist
    resetChecklistButton.addEventListener('click', () => {
        console.log('Reset Checklist button clicked');
        const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            console.log('Resetting:', checkbox.parentElement.textContent.trim());
            checkbox.checked = false; // Uncheck all items
            checkbox.parentElement.style.display = 'block'; // Show all items again
        });
    });
});
