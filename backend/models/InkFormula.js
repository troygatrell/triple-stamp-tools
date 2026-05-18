const { MongoClient, ObjectId } = require('mongodb');
const { getDb } = require('../config/db'); // Correctly destructure getDb

class InkFormula {
    constructor(clientName, jobName, printLocation, date, rows) {
        this.clientName = clientName;
        this.jobName = jobName;
        this.printLocation = printLocation;
        this.date = date;
        this.rows = rows;
        // Formula name will be generated for display/lookup, but not necessarily stored as a top-level key in the DB
        // when creating, we can store it as a field for easier querying and display
        this.formulaName = `${clientName} // ${jobName} (${date})`;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    static async getCollection() {
        const db = await getDb();
        return db.collection('inkformulas');
    }

    static async create(formulaData) {
        const collection = await this.getCollection();
        const newFormula = new InkFormula(
            formulaData.clientName,
            formulaData.jobName,
            formulaData.printLocation,
            formulaData.date,
            formulaData.rows
        );
        const result = await collection.insertOne(newFormula);
        return { ...newFormula, _id: result.insertedId };
    }

    static async findAll() {
        const collection = await this.getCollection();
        return collection.find({}).toArray();
    }

    static async findById(id) {
        const collection = await this.getCollection();
        if (!ObjectId.isValid(id)) {
            return null;
        }
        return collection.findOne({ _id: new ObjectId(id) });
    }

    static async update(id, updateData) {
        const collection = await this.getCollection();
        if (!ObjectId.isValid(id)) {
            return null;
        }
        // Ensure formulaName is updated if clientName, jobName, or date changes
        const updatedData = {
            ...updateData,
            formulaName: `${updateData.clientName} // ${updateData.jobName} (${updateData.date})`,
            updatedAt: new Date()
        };
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
        );
        if (result.matchedCount === 0) {
            return null;
        }
        return this.findById(id); // Return the updated document
    }

    static async delete(id) {
        const collection = await this.getCollection();
        if (!ObjectId.isValid(id)) {
            return null;
        }
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }
}

module.exports = InkFormula;
