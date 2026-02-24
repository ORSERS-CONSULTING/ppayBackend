const express = require("express");
const router = express.Router();
const { getPublicReceipt } = require("../controllers/receiptController");

// NO authMiddleware here
router.get("/receipt", getPublicReceipt);

module.exports = router;
