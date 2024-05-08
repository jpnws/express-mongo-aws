import express, { Request, Response } from "express";
import * as mongoDB from "mongodb";

const app = express();

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!123123");
});

// Adding a new route to display the PAYLOAD_SECRET
app.get("/secrets", (_req: Request, res: Response) => {
  res.send(
    `PAYLOAD_SECRET: ${process.env["PAYLOAD_SECRET"]} DB_USERNAME: ${process.env["DB_USERNAME"]} DB_PASSWORD: ${process.env["DB_PASSWORD"]} DB_HOST: ${process.env["DB_HOST"]}`
  );
});

app.get("/dbconnect", async (_req: Request, res: Response) => {
  const uri = `mongodb://${process.env["DB_USERNAME"]}:${process.env["DB_PASSWORD"]}@${process.env["DB_HOST"]}:27017/testdb?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
  let client: mongoDB.MongoClient = new mongoDB.MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("testdb");
    const collection = db.collection("testcollection");
    await collection.insertOne({ key: "random", value: Math.random() });
    const doc = await collection.findOne({ key: "random" });
    console.log(doc);
    res.send(doc);
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    res.status(500).send("Failed to connect to the database");
  } finally {
    await client.close();
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("NODE_ENV:", process.env["NODE_ENV"]);
});
