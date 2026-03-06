const dns = require("dns");
if (process.env.FORCE_GOOGLE_DNS === "true") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const syncPermissions = require("./utils/syncPermissions");

const app = express();

/* ================= ALLOWED ORIGINS ================= */
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : ["http://localhost:5173"];

const allowedOrigins = Array.from(
  new Set(
    configuredOrigins.flatMap((origin) => {
      try {
        const parsed = new URL(origin);
        // In local dev, frontend is often opened via localhost or 127.0.0.1 interchangeably.
        if (
          parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1"
        ) {
          const otherHost =
            parsed.hostname === "localhost" ? "127.0.0.1" : "localhost";
          return [
            origin,
            `${parsed.protocol}//${otherHost}${parsed.port ? `:${parsed.port}` : ""}`,
          ];
        }
      } catch {
        // Keep invalid entries untouched; they will simply fail matching in CORS check.
      }
      return [origin];
    }),
  ),
);

/* ================= MIDDLEWARE ================= */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* ================= ROUTES ================= */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/roles", require("./routes/roleRoutes"));
app.use("/api/permissions", require("./routes/permissionRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/issues", require("./routes/issueRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/documents", require("./routes/documentRoutes"));

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend Running",
    env: process.env.NODE_ENV,
  });
});

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ================= GLOBAL ERROR HANDLER ================= */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

/* ================= MONGODB ================= */
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("FATAL: MONGO_URI is not set in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully");
    const result = await syncPermissions({ syncSuperAdmin: true });
    console.log(
      `✅ Permissions synced (created: ${result.created}, defaults: ${result.total}, super-admin: ${result.superAdminSynced ? "ok" : "missing"})`,
    );
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

/* ================= SOCKET.IO SETUP ================= */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make io accessible inside controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`,
  );
});

/* ================= GRACEFUL SHUTDOWN ================= */
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
