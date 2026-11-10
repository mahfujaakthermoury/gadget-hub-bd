import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createAdminRouter } from "./routes/adminRoutes.js";
import { connectToDatabase } from "./db.js";

const port = Number(process.env.PORT || 5000);
const clientOrigin = process.env.CLIENT_ORIGIN;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number.");
}

if (!clientOrigin || clientOrigin === "*") {
  throw new Error("CLIENT_ORIGIN must be set to an explicit frontend origin.");
}

let parsedOrigin;
try {
  parsedOrigin = new URL(clientOrigin);
} catch {
  throw new Error("CLIENT_ORIGIN must be a valid HTTP or HTTPS origin.");
}

if (
  !["http:", "https:"].includes(parsedOrigin.protocol) ||
  parsedOrigin.origin !== clientOrigin
) {
  throw new Error("CLIENT_ORIGIN must be an HTTP or HTTPS origin without a path.");
}

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api/auth", createAuthRouter());
app.use("/api/admin", createAdminRouter());

app.get("/api/health", async (_request, response) => {
  try {
    const database = await connectToDatabase();
    await database.command({ ping: 1 });
    response.status(200).json({
      status: "ok",
      services: { server: "running", database: "connected" },
    });
  } catch (error) {
    console.error("MongoDB health check failed:", error.name);
    response.status(503).json({
      status: "error",
      services: { server: "running", database: "disconnected" },
    });
  }
});

app.use((request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);

  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;
  if (status >= 500) {
    console.error("Unhandled API error:", error.name);
  }

  response.status(status).json({
    error: status >= 500 ? "Internal server error." : "Invalid request.",
  });
});

connectToDatabase().catch((error) => {
  console.error(`Initial MongoDB connection failed: ${error.message}`);
});

app.listen(port, () => {
  console.log(`Gadget Hub API listening on port ${port}.`);
});
