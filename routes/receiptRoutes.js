const express = require("express");
const router = express.Router();
const receiptController = require("../controllers/receiptController");
const { authUser } = require("../middleware/authMiddleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

// Core
router.post("/receipts", authUser, receiptController.createReceipt);
router.get("/receipts", authUser, receiptController.listReceipts);
router.get("/receiptDetails", authUser, receiptController.getReceiptDetails);
router.post("/voidReceipt", authUser, receiptController.voidReceipt);
router.get("/countReceipts", authUser, receiptController.countReceipts);
// Logo
router.post(
  "/uploadLogo",
  authUser,
  upload.single("logo"),
  receiptController.uploadLogo,
);

// ✅ Upload PDF (FIXED field name)
router.post(
  "/uploadReceiptPdf",
  authUser,
  upload.single("file"), // 🔥 FIX HERE
  receiptController.uploadReceiptPdf,
);

// ✅ Send email from stored PDF
router.post(
  "/sendReceiptEmailFromDb",
  authUser,
  receiptController.sendReceiptEmailFromDb,
);

router.get("/getLogo", authUser, receiptController.getLogo);
router.get("/products", authUser, receiptController.listProducts);
router.post("/products", authUser, receiptController.createProduct);
router.put("/products/:id", authUser, receiptController.updateProduct);
router.delete("/products/:id", authUser, receiptController.deactivateProduct);

module.exports = router;
