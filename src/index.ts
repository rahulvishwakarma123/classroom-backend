import AgentAPI from "apminsight";
AgentAPI.config();

import express from "express";
import dotenv from "dotenv";
import subjectsRouter from "./router/subjects.js";
import cors from "cors";
import securityMiddleware from "./middleware/security.js";
dotenv.config();
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

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
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(securityMiddleware);

// Better Auth handler - mount at specific path
app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());

app.use("/api/subjects", subjectsRouter);

app.get("/", (req, res) => {
  res.send("Hello, Welcome to classroom API.");
});

app.listen(PORT, () => {
  console.log(`app is running at http://localhost:${PORT}`);
});
