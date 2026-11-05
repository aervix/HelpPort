import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";


import authRoutes from "./routes/auth.route.ts";
import companyRoutes from "./routes/company.route.ts";
import documentRoutes from "./routes/document.route.ts";
import agentResponseRoutes from "./routes/agent.route.ts";
import { startServer } from "./db/db.ts";


const app: Application = express();
const PORT = process.env.PORT ;


app.use(helmet());

const allowedOrigins = process.env.CLIENT_URLS?.split(",") || [];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());


app.get("/health", (_req: Request, res: Response) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});


await startServer();


app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/agent-responses", agentResponseRoutes);


app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "API route not found" });
});


app.listen(PORT, () => {
  console.log(`Welcome To HelpPort Server...`);
});

export default app;
