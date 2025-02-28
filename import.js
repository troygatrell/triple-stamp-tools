const { MongoClient } = require('mongodb');

// --- Configuration (REPLACE WITH YOUR VALUES) ---
const apiKey = "AIzaSyB1m7oJ5wKxc55zv8qvTkssQA74GCLh9PY"; // Your Google Sheets API Key
const spreadsheetId = "13ODJpmIWWI6CaCvSwRJhKn3g4V4-f3YIdlacBrjwuHw"; // Your Spreadsheet ID
const mongoURI = 'mongodb+srv://troygatrell:oNNaef4yC1WzLnXc@cluster0.rrcs0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // YOUR CORRECTED CONNECTION STRING
const dbName = 'inventoryDB';     // Your database name
const collectionName = 'inventory'; // Your collection name

// --- Google Sheets API Functions (from your existing code) ---
async function getSheetNames() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    try {
        const response = await fetch(url); // Use built-in fetch
        const data = await response.json();
        if (!data.sheets) {
            throw new Error("No sheets found in the response.");
        }
        const sheetNames = data.sheets.map((sheet) => sheet.properties.title);
        return sheetNames.slice(1); // Exclude the first sheet
    } catch (error) {
        console.error("Error fetching sheet names:", error);
        throw error; // Re-throw the error
    }
}

async function fetchSheetData(sheetName) {
    const range = `${sheetName}!A1:Z1000`; // Adjust range as needed
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const response = await fetch(url); // Use built-in fetch
    const data = await response.json();
    return data.values || []; // Return the rows or an empty array
}
// --- MongoDB Import Function ---

async function importDataToMongoDB() {
    let client; // Declare client outside the try block
    try {
        client = new MongoClient(mongoURI);
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const sheetNames = await getSheetNames();
        const allData = [];
        for (const sheetName of sheetNames) {
             const sheetData = await fetchSheetData(sheetName);
             if (sheetData.length > 1) {
                for (let col = 0; col < sheetData[0].length; col++) {
                    const header = sheetData[0][col];
                    for (let row = 1; row < sheetData.length; row++) {
                        const cellValue = sheetData[row][col];
                            //THIS IS THE FIX:
                            if (cellValue !== undefined && cellValue !== null && cellValue.trim() !== "") { //Check for a value.
                                allData.push({
                                    month: header,
                                    sheet: sheetName,
                                    value: cellValue.toString(),
                                    originalValue: cellValue.toString(),
                                    originalSheet: sheetName, // ADD THIS
                                    originalMonth: header,    // ADD THIS
                                });
                            }
                        }
                    }
                }
            }
        console.log("Importing data to MongoDB...");
        // Use insertMany for efficient bulk insert
        const result = await collection.insertMany(allData, { ordered: false }); // Add options here
        console.log(`${result.insertedCount} documents inserted into MongoDB`);

    } catch (error) {
        console.error('Error importing data:', error);
    } finally {
        if (client) {
          await client.close(); // Ensure the client is closed
          console.log('Disconnected from MongoDB');
        }

    }
}

importDataToMongoDB(); // Call the import function