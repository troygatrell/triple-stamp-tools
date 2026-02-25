const { MongoClient } = require("mongodb");

let db;

async function connectToMongo() {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error(
      "Missing required environment variable MONGO_URI. Please set it before starting the server."
    );
    process.exit(1);
  }

  try {
    const client = new MongoClient(mongoURI);
    await client.connect();
    db = client.db("inventoryDB");
    console.log("Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call connectToMongo first.");
  }
  return db;
}

module.exports = { connectToMongo, getDb };
