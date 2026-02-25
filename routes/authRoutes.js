const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authMiddleware");

const {
  login,
  register,
  refresh,
  logout,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/register", register);
router.delete("/deleteAccount", authUser, deleteAccount);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;
