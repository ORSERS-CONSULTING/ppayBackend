const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const receiptRoutes = require("./routes/receiptRoutes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.use("/", authRoutes);
app.use("/", receiptRoutes);

module.exports = app;
