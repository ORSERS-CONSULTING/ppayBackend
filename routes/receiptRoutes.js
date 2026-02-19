const express = require("express");
const router = express.Router();
const receiptController = require("../controllers/receiptController");
const { authUser } = require("../middleware/authMiddleware");

// Protect all receipt routes
router.post("/receipts", authUser, receiptController.createReceipt);
router.get("/receipts", authUser, receiptController.listReceipts);
router.get("/receiptDetails", authUser, receiptController.getReceiptDetails);
router.post("/voidReceipt", authUser, receiptController.voidReceipt);

module.exports = router;
