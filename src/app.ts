import express, { Request, Response } from "express";
import cors from "cors";
import { PORT } from "./config";
import gmailRouter from "./router/gmailRouter";

const app = express();

app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello ReachInbox");
});
app.use(gmailRouter);

// start the server
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
