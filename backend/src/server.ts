import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { MulterError } from "multer";
import { Prisma } from "@prisma/client";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { createServer } from "http";
import { initSocket } from "./lib/socket.js";
import { aiRouter } from "./routes/ai.routes.js";
import { formatPackage } from "./lib/package.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { offCampusRouter } from "./routes/offCampus.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { drivesRouter } from "./routes/drives.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { testsRouter } from "./routes/tests.routes.js";
import { questionsRouter } from "./routes/questions.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { recruitersRouter } from "./routes/recruiters.routes.js";
import { sendEmail, getEmailTemplate } from "./services/mailer.js";
import { checkEligibility } from "./services/eligibility.js";
import { initDeadlineReminderJob } from "./jobs/deadlineReminder.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = new Set([
  process.env.FRONTEND_URL ?? "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
]);

// Render (and Vercel) put one reverse proxy in front of the API. Without this, express-rate-limit sees the
// proxy's address for every request (one shared limit for all users) and logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// gzip: the drives and applications lists are 30-100 KB of JSON, so this cuts transfer time on slow links.
app.use(compression());
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
app.use("/api/off-campus", offCampusRouter);
app.use("/api/tests", testsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/public", publicRouter);
app.use("/api/recruiters", recruitersRouter);
app.use("/uploads", express.static("uploads"));

function wrapRouter(router: any) {
  if (!router || !router.stack) return;
  router.stack.forEach((layer: any) => {
    if (layer.route) {
      layer.route.stack.forEach((routeLayer: any) => {
        const originalHandler = routeLayer.handle;
        if (originalHandler && originalHandler.length <= 3) {
          routeLayer.handle = async (req: any, res: any, next: any) => {
            try {
              await originalHandler(req, res, next);
            } catch (err) {
              next(err);
            }
          };
        }
      });
    }
  });
}

wrapRouter(authRouter);
wrapRouter(dashboardRouter);
wrapRouter(drivesRouter);
wrapRouter(applicationsRouter);
wrapRouter(offCampusRouter);
wrapRouter(testsRouter);
wrapRouter(notificationsRouter);
wrapRouter(aiRouter);
wrapRouter(reportsRouter);
wrapRouter(questionsRouter);
wrapRouter(publicRouter);
wrapRouter(recruitersRouter);

app.use((_request, response) => response.status(404).json({ error: "Route not found" }));

app.use(errorHandler);

const httpServer = createServer(app);
initSocket(httpServer);

// Tests import this module from several files, so they bind an ephemeral port instead of a fixed one.
const listenPort = process.env.NODE_ENV === "test" ? 0 : port;
const server = httpServer.listen(listenPort, async () => {
  console.log(`PlaceTrack API running on http://localhost:${port}`);
  try {
    await prisma.$connect();
    console.log("Database connection established.");
    initDeadlineReminderJob();
    const userCount = await prisma.user.count();
    if (userCount === 0 && process.env.AUTO_SEED === "true") {
      console.log("Database is empty and AUTO_SEED=true. Initiating database auto-seed...");
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
      console.log(`Database ready — ${userCount} users found. Auto-seed skipped.`);
    }
  } catch (error) {
    console.error("Failed to connect to database:", error);
  }
});

// Keep track of sent reminders in memory to prevent duplicate emails
const sentDeadlineReminders = new Set<string>();

async function checkUpcomingDriveDeadlines() {
  try {
    const now = new Date();
    const targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Find drives ending within 24 hours that are open
    const drives = await prisma.placementDrive.findMany({
      where: {
        status: "OPEN",
        deadline: {
          gt: now,
          lte: targetTime,
        },
      },
      include: {
        company: true,
      },
    });

    for (const drive of drives) {
      if (sentDeadlineReminders.has(drive.id)) continue;

      console.log(`[Deadline Checker] Drive ${drive.company.name} (${drive.role}) is closing within 24 hours. Sending reminders...`);

      // Find all students who haven't applied to this drive yet
      const students = await prisma.student.findMany({
        where: {
          emailEnabled: true,
          graduationYear: drive.graduationYear,
          applications: {
            none: {
              driveId: drive.id,
            },
          },
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      for (const student of students) {
        // Run full eligibility check
        const eligibility = checkEligibility(student, drive);
        if (!eligibility.eligible) continue;

        const emailHtml = getEmailTemplate(
          "Upcoming Application Deadline",
          `<p>Dear ${student.name},</p>
           <p>This is a friendly reminder that the application deadline for <b>${drive.company.name}</b> (Role: <b>${drive.role}</b>) is closing within 24 hours!</p>
           <p><b>Drive Details:</b></p>
           <ul style="padding-left: 20px; line-height: 1.8;">
             <li><b>Deadline:</b> ${new Date(drive.deadline).toLocaleString()}</li>
             <li><b>Package:</b> Rs ${formatPackage(drive.package, drive.packageMax)}</li>
             <li><b>Location:</b> ${drive.location}</li>
           </ul>
           <p>Don't miss out on this opportunity. Please submit your application as soon as possible.</p>`
        );

        sendEmail({
          to: student.user.email,
          subject: `[PlaceTrack] Deadline Reminder - ${drive.company.name}`,
          html: emailHtml,
        }).catch((err) => console.error(`Failed to send deadline reminder to ${student.user.email}:`, err));
      }

      // Mark as reminded
      sentDeadlineReminders.add(drive.id);
    }
  } catch (error) {
    console.error("[Deadline Checker] Error running deadline check:", error);
  }
}

// Run checks periodically (every hour)
const deadlineCheckInterval = setInterval(checkUpcomingDriveDeadlines, 60 * 60 * 1000);
// Run once shortly after startup
const deadlineCheckTimeout = setTimeout(checkUpcomingDriveDeadlines, 10 * 1000);

const shutdown = async () => {
  clearInterval(deadlineCheckInterval);
  clearTimeout(deadlineCheckTimeout);
  server.close();
  await prisma.$disconnect();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app };