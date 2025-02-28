const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Replace with your MongoDB Atlas connection string
const mongoURI = 'mongodb+srv://troygatrell:oNNaef4yC1WzLnXc@cluster0.rrcs0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS for all origins (for development)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

let db;

// Connect to MongoDB
async function connectToMongo() {
    try {
        const client = new MongoClient(mongoURI);
        await client.connect();
        db = client.db('inventoryDB');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

// --- API Endpoints ---

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
    try {
        const items = await db.collection('inventory').find({}).toArray();
        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Update an inventory item
app.put('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedItem = req.body;

        if (!id || !updatedItem) {
            return res.status(400).json({ error: 'Missing ID or update data' });
        }

        const result = await db.collection('inventory').updateOne(
            { _id: new ObjectId(id) }, // Use ObjectId here
            { $set: updatedItem }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ message: 'Item updated successfully' });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Create a new inventory item (POST)
app.post('/api/inventory', async (req, res) => {
    try {
        const newItem = req.body;

        // Basic validation (add more as needed)
        if (!newItem.sheet || !newItem.month || !newItem.value) {
            return res.status(400).json({ error: 'Missing required fields (sheet, month, value)' });
        }

        const result = await db.collection('inventory').insertOne(newItem);

         const createdItem = {
          _id: result.insertedId, // Get the generated _id
          ...newItem,              // Include the rest of the data
        };

        res.status(201).json(createdItem); // 201 Created

    } catch (error) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

// Delete an inventory item (DELETE)  <-- ADD THIS ROUTE
app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Missing ID' });
        }

        const result = await db.collection('inventory').deleteOne(
            { _id: new ObjectId(id) } // VERY IMPORTANT: Use ObjectId
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Item not found' }); // 404 if not found
        }

        res.json({ message: 'Item deleted successfully' }); // 200 OK

    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ error: 'Failed to delete item' }); // 500 Internal Server Error
    }
});

// Start the server *after* connecting to the database
connectToMongo().then(() => {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
});