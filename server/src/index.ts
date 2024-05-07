import express, { Request, Response } from "express";

const app = express();

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!123123");
});

// Adding a new route to display the PAYLOAD_SECRET
app.get("/secret", (_req: Request, res: Response) => {
  const secret = process.env["PAYLOAD_SECRET"] || "No secret found";
  res.send(`PAYLOAD_SECRET: ${secret}`);
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
