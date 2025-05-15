import express from "express";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());

// Main query endpoint
app.post("/query", async (req, res) => {
  const {
    connectionString,
    databaseName,
    command
  } = req.body;

  if (!connectionString || !databaseName || !command) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    const db = client.db(databaseName);
    const collection = db.collection(command.collection);

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
  } finally {
    await client.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mongo backend listening on http://localhost:${PORT}`);
});
