import express, { Request, Response } from "express";

const app = express();

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!123123");
});

app.listen(3000, () => {
  console.log("NODE_ENV:", process.env["NODE_ENV"]);
});
