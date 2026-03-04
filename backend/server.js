const express = require("express");
const cors = require("cors");
const { connectToMongo } = require("./config/db");
const inventoryRoutes = require("./routes/inventory");

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());

app.use(
  cors({
    origin: [
      "https://triplestamptools.onrender.com",
      "http://localhost:3000",
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "http://localhost",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// --- Routes ---
app.use("/api/inventory", inventoryRoutes);

// --- Initialization ---
connectToMongo().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
