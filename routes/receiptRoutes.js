const express = require("express");
const router = express.Router();
const receiptController = require("../controllers/receiptController");
const { authUser } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
router.post("/receipts", authUser, receiptController.createReceipt);
router.get("/receipts", authUser, receiptController.listReceipts);
router.get("/receiptDetails", authUser, receiptController.getReceiptDetails);
router.post("/voidReceipt", authUser, receiptController.voidReceipt);
router.post(
  "/uploadLogo",
  authUser,
  upload.single("logo"),
  receiptController.uploadLogo,
);
router.get("/getLogo", receiptController.getLogo);
router.patch("/", authUser, receiptController.updateProfile);
module.exports = router;
