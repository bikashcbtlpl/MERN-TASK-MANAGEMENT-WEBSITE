require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const morgan = require("morgan");

// Middleware

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend
    credentials: true,
  })
);

app.use(morgan("dev"));

app.use(express.json());

app.use(cookieParser());

const roleRoutes = require("./routes/roleRoutes");
app.use("/api/roles", roleRoutes);

const permissionRoutes = require("./routes/permissionRoutes");
app.use("/api/permissions", permissionRoutes);

const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);

const settingsRoutes = require("./routes/settingsRoutes");
app.use("/api/settings", settingsRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);


// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("MongoDB Error:", err));

// Test Route
app.get("/", (req, res) => {
  res.send("Backend Running...");
});

// Start Server
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
