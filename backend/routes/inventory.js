const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");

const router = express.Router();

// Get all inventory items
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const items = await db.collection("inventory").find({}).toArray();
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Create a new inventory item
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const newItem = req.body;

    if (!newItem.sheet || !newItem.month || !newItem.value) {
      return res
        .status(400)
        .json({ error: "Missing required fields (sheet, month, value)" });
    }

    const result = await db.collection("inventory").insertOne(newItem);
    const createdItem = {
      _id: result.insertedId,
      ...newItem,
    };

    res.status(201).json(createdItem);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// Update an inventory item
router.put("/:id", async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const updatedItem = req.body;

    if (!id || !updatedItem) {
      return res.status(400).json({ error: "Missing ID or update data" });
    }

    const result = await db.collection("inventory").updateOne(
      { _id: new ObjectId(id) },
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

// Delete an inventory item
router.delete("/:id", async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing ID" });
    }

    const result = await db.collection("inventory").deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = router;
