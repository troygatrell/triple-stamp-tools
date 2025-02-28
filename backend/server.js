const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors"); // Import the cors package
const jwt = require("jsonwebtoken"); // Import jsonwebtoken
const app = express();
const port = process.env.PORT || 3000;


// Get the MongoDB connection string from the environment variable
const mongoURI = process.env.MONGO_URI;

// --- Middleware ---
app.use(express.json()); // Parse JSON request bodies

// Enable CORS for your frontend's origin
app.use(
  cors({
    origin: [
      "https://triplestamptools.onrender.com",
      "http://localhost:3000", // Keep this for local server testing
      "http://127.0.0.1:5500", // Add this for your local development environment
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

let db;

// Connect to MongoDB
async function connectToMongo() {
  try {
    const client = new MongoClient(mongoURI);
    await client.connect();
    db = client.db("inventoryDB");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit the process if we can't connect to the database
  }
}

// --- API Endpoints ---

// Authentication endpoint
app.post("/api/authenticate", (req, res) => {
  const providedPasskey = req.body.passkey;
  const storedPasskey = process.env.PASSKEY; // Or fetch from database

  if (providedPasskey === storedPasskey) {
    // Generate JWT
    const token = jwt.sign(
      {
        /* You can add user data here if needed */
      },
      process.env.JWT_SECRET
    ); // Make sure to set JWT_SECRET in your environment variables
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid passkey" });
  }
});

// Get all inventory items
app.get("/api/inventory", async (req, res) => {
  try {
    const items = await db.collection("inventory").find({}).toArray();
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Middleware to protect edit route
function authenticate(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Make user data available in the route handler (if needed)
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Update an inventory item
app.put('/api/inventory/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedItem = req.body;

    if (!id || !updatedItem) {
      return res.status(400).json({ error: "Missing ID or update data" });
    }

    const result = await db.collection("inventory").updateOne(
      { _id: new ObjectId(id) }, // Use ObjectId here
      { $set: updatedItem }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item updated successfully" });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// Create a new inventory item (POST)
app.post("/api/inventory", async (req, res) => {
  try {
    const newItem = req.body;

    // Basic validation (add more as needed)
    if (!newItem.sheet || !newItem.month || !newItem.value) {
      return res
        .status(400)
        .json({ error: "Missing required fields (sheet, month, value)" });
    }

    const result = await db.collection("inventory").insertOne(newItem);

    const createdItem = {
      _id: result.insertedId, // Get the generated _id
      ...newItem, // Include the rest of the data
    };

    res.status(201).json(createdItem); // 201 Created
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// Delete an inventory item (DELETE)
app.delete("/api/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing ID" });
    }

    const result = await db.collection("inventory").deleteOne(
      { _id: new ObjectId(id) } // VERY IMPORTANT: Use ObjectId
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" }); // 404 if not found
    }

    res.json({ message: "Item deleted successfully" }); // 200 OK
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ error: "Failed to delete item" }); // 500 Internal Server Error
  }
});

// Start the server *after* connecting to the database
connectToMongo().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
