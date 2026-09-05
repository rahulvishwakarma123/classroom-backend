import express from "express";
import dotenv from "dotenv";
import subjectsRouter from "./router/subjects.js";
import cors from "cors";
import securityMiddleware from "./middleware/security.ts";

dotenv.config();

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

app.use(securityMiddleware)

app.use("/api/subjects", subjectsRouter);

app.get("/", (req, res) => {
  res.send("Hello, Welcome to classroom API.");
});

app.listen(PORT, () => {
  console.log(`app is running at http://localhost:${PORT}`);
});
