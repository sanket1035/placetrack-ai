import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { MulterError } from "multer";
import { Prisma } from "@prisma/client";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { aiRouter } from "./routes/ai.routes.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { drivesRouter } from "./routes/drives.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { testsRouter } from "./routes/tests.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = new Set([
  process.env.FRONTEND_URL ?? "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
]);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.disable("etag");
app.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-7" }));

app.get("/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", service: "placetrack-api", database: "connected" });
  } catch {
    response.status(503).json({ status: "degraded", service: "placetrack-api", database: "unavailable" });
  }
});
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/drives", drivesRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/tests", testsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/reports", reportsRouter);

app.use((_request, response) => response.status(404).json({ error: "Route not found" }));
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return response.status(400).json({ error: "Invalid request", issues: error.issues });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return response.status(409).json({ error: "This record already exists" });
    if (error.code === "P2025") return response.status(404).json({ error: "Record not found" });
  }
  if (error instanceof MulterError) return response.status(400).json({ error: error.message });
  console.error(error);
  return response.status(500).json({ error: "Something went wrong" });
});

const server = app.listen(port, async () => {
  console.log(`PlaceTrack API running on http://localhost:${port}`);
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("Database is empty. Initiating database auto-seed...");
      const { fork } = await import("child_process");
      const path = await import("path");
      const seedPath = path.resolve(process.cwd(), "dist/prisma/seed.js");
      console.log(`Spawning auto-seed process at: ${seedPath}`);
      const child = fork(seedPath);
      child.on("exit", (code) => {
        if (code === 0) {
          console.log("Database auto-seeded successfully.");
        } else {
          console.error(`Database auto-seed failed with exit code: ${code}`);
        }
      });
    } else {
      console.log(`Database has existing data (${userCount} users). Skipping auto-seed.`);
    }
  } catch (error) {
    console.error("Failed to check database/run auto-seed:", error);
  }
});
const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app };
