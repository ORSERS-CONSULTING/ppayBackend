const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authMiddleware");

const {
  login,
  register,
  refresh,
  logout,
  deleteAccount,
  sendOtp,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/register", register);
router.post("/deleteAccount", authUser, deleteAccount);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/sendOtp", sendOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/resetPassword", resetPassword);

module.exports = router;
