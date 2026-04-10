import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const hasClientBuild = fs.existsSync(clientIndexPath);
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://vansh:vansh%402024@vanshdb.snabvtl.mongodb.net/iitm";
const ADMIN_USER = process.env.ADMIN_USER || "vansh";
const ADMIN_PASS = process.env.ADMIN_PASS || "vansh099";

const entrySchema = new mongoose.Schema(
  {
    game: { type: String, required: true, trim: true },
    productId: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    amount: { type: String, required: true, trim: true },
    price: { type: String, default: "Free", trim: true },
    contactGameId: { type: String, required: true, trim: true },
    contactInfo: { type: String, required: true, trim: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Failed"],
      default: "Pending"
    }
  },
  {
    timestamps: true
  }
);

const Entry = mongoose.model("Entry", entrySchema);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ success: true, message: "API is running" });
});

app.post("/api/entries", async (request, response) => {
  try {
    const entry = await Entry.create(request.body);
    response.status(201).json({ success: true, orderId: entry._id.toString() });
  } catch (error) {
    response.status(400).json({
      success: false,
      message: error.message || "Could not store entry."
    });
  }
});

app.get("/api/entries", async (_request, response) => {
  try {
    const entries = await Entry.find().sort({ createdAt: -1 }).lean();
    response.json({ success: true, entries });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: error.message || "Could not fetch entries."
    });
  }
});

app.patch("/api/entries/:id/payment-status", async (request, response) => {
  const { id } = request.params;
  const { paymentStatus } = request.body;

  if (!["Pending", "Confirmed", "Failed"].includes(paymentStatus)) {
    response.status(400).json({
      success: false,
      message: "Invalid payment status."
    });
    return;
  }

  try {
    const entry = await Entry.findByIdAndUpdate(
      id,
      { paymentStatus },
      { new: true, runValidators: true }
    ).lean();

    if (!entry) {
      response.status(404).json({
        success: false,
        message: "Entry not found."
      });
      return;
    }

    response.json({ success: true, entry });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: error.message || "Could not update payment status."
    });
  }
});

app.post("/api/admin-login", (request, response) => {
  const { username, password } = request.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    response.json({ success: true });
    return;
  }

  response.status(401).json({ success: false, message: "Invalid admin credentials." });
});

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
  app.get("*", (_request, response) => {
    response.sendFile(clientIndexPath);
  });
}

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB or start server.", error);
    process.exit(1);
  }
}

startServer();
