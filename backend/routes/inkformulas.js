const express = require('express');
const router = express.Router();
const InkFormula = require('../models/InkFormula'); // Path to the new model

// GET all ink formulas
router.get('/', async (req, res) => {
    try {
        const formulas = await InkFormula.findAll();
        res.json(formulas);
    } catch (err) {
        console.error('Error fetching ink formulas:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET a single ink formula by ID
router.get('/:id', async (req, res) => {
    try {
        const formula = await InkFormula.findById(req.params.id);
        if (formula == null) {
            return res.status(404).json({ message: 'Cannot find ink formula' });
        }
        res.json(formula);
    } catch (err) {
        console.error('Error fetching ink formula by ID:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST a new ink formula
router.post('/', async (req, res) => {
    try {
        const newFormula = await InkFormula.create(req.body);
        res.status(201).json(newFormula);
    } catch (err) {
        console.error('Error creating ink formula:', err);
        res.status(400).json({ message: err.message });
    }
});

// PUT (update) an existing ink formula
router.put('/:id', async (req, res) => {
    try {
        const updatedFormula = await InkFormula.update(req.params.id, req.body);
        if (updatedFormula == null) {
            return res.status(404).json({ message: 'Cannot find ink formula to update' });
        }
        res.json(updatedFormula);
    } catch (err) {
        console.error('Error updating ink formula:', err);
        res.status(400).json({ message: err.message });
    }
});

// DELETE an ink formula
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await InkFormula.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Cannot find ink formula to delete' });
        }
        res.json({ message: 'Ink formula deleted' });
    } catch (err) {
        console.error('Error deleting ink formula:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
