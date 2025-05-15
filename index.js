import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

let mongoClient = null;
let currentDb = null;

// Configuration endpoint
app.post("/configure", async (req, res) => {
  const { connectionString, databaseName } = req.body;

  if (!connectionString || !databaseName) {
    return res.status(400).json({ error: "Missing connection details" });
  }

  try {
    // Close existing connection if any
    if (mongoClient) {
      await mongoClient.close();
    }

    // Create new connection
    mongoClient = new MongoClient(connectionString);
    await mongoClient.connect();
    currentDb = mongoClient.db(databaseName);

    res.json({ message: "Database connection configured successfully" });
  } catch (error) {
    console.error("MongoDB configuration error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Query endpoint
app.post("/query", async (req, res) => {
  const { command } = req.body;

  if (!mongoClient || !currentDb) {
    return res.status(400).json({ error: "Database connection not configured" });
  }

  try {
    const collection = currentDb.collection(command.collection);
    let result;

    switch (command.action) {
      case "query":
        result = await collection
          .find(command.filter || {}, {
            projection: command.projection || {},
          })
          .limit(command.limit || 10)
          .toArray();
        break;

      case "aggregate":
        result = await collection.aggregate(command.pipeline || []).toArray();
        break;

      case "insert":
        result = await collection.insertMany(command.documents || []);
        break;

      case "update":
        result = await collection.updateMany(
          command.filter || {},
          command.update || {}
        );
        break;

      case "delete":
        result = await collection.deleteMany(command.filter || {});
        break;

      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    res.json({ result });
  } catch (error) {
    console.error("MongoDB error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mongo backend listening on http://localhost:${PORT}`);
});
