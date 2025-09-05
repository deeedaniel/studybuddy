import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index";
import { notFound, errorHandler } from "./middleware/error";
import CronJobService from "./services/cronJobs";

const app = express();

app.use(helmet());
// Allow all origins for hackathon - simplified CORS config
app.use(
  cors({
    origin: "*", // Allow all origins
    credentials: false, // Set to false when using wildcard origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => {
  res.json({ name: "studybuddy-api", version: "1.0.0" });
});

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);

  // Start the cron jobs when server starts
  CronJobService.startDailyReminderJob();
});
