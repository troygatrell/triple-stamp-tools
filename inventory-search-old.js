const apiKey = 'AIzaSyAu932XB2z6lfaigpZGbgTZlr4O3WDZa4o'; // Replace with your actual API key
const spreadsheetId = '13ODJpmIWWI6CaCvSwRJhKn3g4V4-f3YIdlacBrjwuHw'; // Replace with your actual spreadsheet ID

// Function to get all sheet names
async function getSheetNames() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('API Response:', data); // Debugging: Log the API response

        if (!data.sheets) {
            throw new Error('No sheets found in the response.');
        }

        // Exclude the first sheet (assuming it's the Search sheet)
        const sheetNames = data.sheets.map(sheet => sheet.properties.title);
        return sheetNames.slice(1); // Exclude the first sheet
    } catch (error) {
        console.error('Error fetching sheet names:', error);
        throw error; // Re-throw the error to be caught in fetchAllData
    }
}

// Function to fetch data from a specific sheet
async function fetchSheetData(sheetName) {
    const range = `${sheetName}!A1:Z1000`; // Adjust range as needed
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.values || []; // Return the rows or an empty array
}

// Function to fetch data from all sheets
async function fetchAllData() {
    const sheetNames = await getSheetNames();
    const allData = [];

    for (const sheetName of sheetNames) {
        const sheetData = await fetchSheetData(sheetName);
        if (sheetData.length > 1) { // Check if there's data beyond headers
            for (let col = 0; col < sheetData[0].length; col++) { // Iterate through each column
                const header = sheetData[0][col]; // Get the month header (e.g., January, February)
                for (let row = 1; row < sheetData.length; row++) { // Start from 1 to skip headers
                    const cellValue = sheetData[row][col];
                    if (cellValue !== undefined && cellValue !== null) { // Check if cellValue is defined
                        allData.push({
                            month: header,
                            sheet: sheetName,
                            value: cellValue.toString() // Convert to string safely
                        });
                    }
                }
            }
        }
    }

    setupSearch(allData); // No need to reverse the data
}

// Function to set up search functionality
function setupSearch(allData) {
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        console.log('Search input:', searchTerm); // Debugging: Check input value

        if (!searchTerm) {
            displayResults([]); // Clear results if search is empty
            return;
        }

        const results = allData.filter(item => {
            return item.value.toLowerCase().includes(searchTerm);
        });

        console.log('Search results:', results); // Debugging: Check filtered results
        displayResults(results);
    });
}

// Function to display search results
function displayResults(results) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = ''; // Clear any previous results

    let lastYear = ''; // Keep track of the last displayed year

    if (results.length > 0) {
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            let yearColumn = '';
            if (item.sheet !== lastYear) {
                yearColumn = `<div class="result-column">${item.sheet}</div>`;
                lastYear = item.sheet; // Update the lastYear to the current one
            } else {
                yearColumn = `<div class="result-column"></div>`; // Empty div to maintain alignment
            }

            // Format: "Year | Month | Value" in separate columns
            resultItem.innerHTML = `
                ${yearColumn}
                <div class="result-column">${item.month}</div>
                <div class="result-column">${item.value}</div>
            `;

            resultsContainer.appendChild(resultItem);
        });
    }
}

// Fetch all data when the page loads
fetchAllData().then(() => {
    console.log('Data fetched and search setup complete');
}).catch(error => console.error('Error fetching data:', error));
