const express = require("express");
const multer = require("multer");

const router = express.Router();

const receiptController = require("../controllers/receiptController");
const { authUser } = require("../middleware/authMiddleware");
const {
  requireCompany,
} = require("../middleware/companyMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
});

/*
 * Receipts
 */
router.post(
  "/receipts",
  authUser,
  requireCompany,
  receiptController.createReceipt,
);

router.get(
  "/receipts",
  authUser,
  requireCompany,
  receiptController.listReceipts,
);

router.get(
  "/receiptDetails",
  authUser,
  requireCompany,
  receiptController.getReceiptDetails,
);

router.post(
  "/voidReceipt",
  authUser,
  requireCompany,
  receiptController.voidReceipt,
);

router.get(
  "/countReceipts",
  authUser,
  requireCompany,
  receiptController.countReceipts,
);

/*
 * Company logo
 */
router.post(
  "/uploadLogo",
  authUser,
  requireCompany,
  upload.single("logo"),
  receiptController.uploadLogo,
);

router.get(
  "/getLogo",
  authUser,
  requireCompany,
  receiptController.getLogo,
);

/*
 * Profile
 *
 * This route only needs the authenticated user.
 * Your ORDS profile endpoint resolves the company using user_id.
 */

router.get(
  "/profile",
  authUser,
  receiptController.getProfile,
);

router.patch(
  "/profile",
  authUser,
  receiptController.updateProfile,
);

/*
 * Receipt PDF
 */
router.post(
  "/uploadReceiptPdf",
  authUser,
  requireCompany,
  upload.single("file"),
  receiptController.uploadReceiptPdf,
);

/*
 * Receipt email
 */
router.post(
  "/sendReceiptEmailFromDb",
  authUser,
  requireCompany,
  receiptController.sendReceiptEmailFromDb,
);

/*
 * Products
 */
router.get(
  "/products",
  authUser,
  requireCompany,
  receiptController.listProducts,
);

router.post(
  "/products",
  authUser,
  requireCompany,
  receiptController.createProduct,
);

router.put(
  "/products/:id",
  authUser,
  requireCompany,
  receiptController.updateProduct,
);

router.delete(
  "/products/:id",
  authUser,
  requireCompany,
  receiptController.deactivateProduct,
);

router.post(
  "/importProducts",
  authUser,
  requireCompany,
  upload.single("file"),
  receiptController.importProducts,
);

module.exports = router;