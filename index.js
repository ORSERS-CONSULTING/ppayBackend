const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const publicRoutes = require("./routes/publicRoutes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.use("/", authRoutes);
app.use("/", receiptRoutes);
app.use("/", publicRoutes);

module.exports = app;
