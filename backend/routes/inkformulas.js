const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");

const router = express.Router();

// Get all ink formulas
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const inkFormulas = await db.collection("inkformulas").find({}).toArray();
    res.json(inkFormulas);
  } catch (error) {
    console.error("Error fetching ink formulas:", error);
    res.status(500).json({ error: "Failed to fetch ink formulas" });
  }
});

// Create a new ink formula
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const newFormula = req.body;

    // Validation for required fields in the new structure
    if (!newFormula.formulaName || !newFormula.structuredFormula) {
      return res
        .status(400)
        .json({ error: "Missing required fields (formulaName, structuredFormula)" });
    }

    const result = await db.collection("inkformulas").insertOne({
      ...newFormula,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const createdFormula = {
      _id: result.insertedId,
      ...newFormula,
    };

    res.status(201).json(createdFormula);
  } catch (error) {
    console.error("Error creating ink formula:", error);
    res.status(500).json({ error: "Failed to create ink formula" });
  }
});

// Update an ink formula
router.put("/:id", async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const updatedFormula = req.body;

    if (!id || !updatedFormula) {
      return res.status(400).json({ error: "Missing ID or update data" });
    }

    // Ensure _id is not updated
    delete updatedFormula._id;

    const result = await db.collection("inkformulas").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updatedFormula, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Ink formula not found" });
    }

    res.json({ message: "Ink formula updated successfully" });
  } catch (error) {
    console.error("Error updating ink formula:", error);
    res.status(500).json({ error: "Failed to update ink formula" });
  }
});

// Delete an ink formula
router.delete("/:id", async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing ID" });
    }

    const result = await db.collection("inkformulas").deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Ink formula not found" });
    }

    res.json({ message: "Ink formula deleted successfully" });
  } catch (error) {
    console.error("Error deleting ink formula:", error);
    res.status(500).json({ error: "Failed to delete ink formula" });
  }
});

module.exports = router;
