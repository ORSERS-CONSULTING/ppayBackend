const { callOrds } = require("../services/ordsService");
const crypto = require("crypto");
const { signAccessToken } = require("../utils/jwt");

const REFRESH_PEPPER = process.env.REFRESH_TOKEN_PEPPER_OCID;

if (!REFRESH_PEPPER) {
  throw new Error("REFRESH_TOKEN_PEPPER_OCID is missing");
}

function hashToken(token) {
  return crypto
    .createHmac("sha256", String(REFRESH_PEPPER))
    .update(String(token))
    .digest("hex");
}

const bcrypt = require("bcrypt");

async function login(req, res) {
  try {
    const { email, password, device_id } = req.body;

    console.log("🟡 [LOGIN] Incoming:", { email, device_id });

    if (!email || !password || !device_id) {
      console.warn("⚠️ [LOGIN] Missing credentials");
      return res.status(400).json({ error: "Missing credentials" });
    }

    const result = await callOrds("/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    console.log("📥 [LOGIN] ORDS response:", JSON.stringify(result, null, 2));

    const userId = result?.out_user_id;
    const passwordHash = result?.out_password_hash;

    if (!userId || !passwordHash) {
      console.warn("❌ [LOGIN] User not found or missing hash");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("🔐 [LOGIN] Comparing password...");
    const isMatch = await bcrypt.compare(password, passwordHash);

    console.log("🔎 [LOGIN] Password match result:", isMatch);

    if (!isMatch) {
      console.warn("❌ [LOGIN] Invalid password");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const access_token = signAccessToken({
      sub: String(userId),
      company_id: result.out_company_id, // 🔥 comes from ORDS
      role: "user",
    });

    const refresh_token = crypto.randomBytes(64).toString("hex");
    const token_hash = hashToken(refresh_token);

    console.log("🔁 [LOGIN] Revoking existing tokens for device...");

    await callOrds("/authTokens/revokeByUserDevice", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(userId),
        device_id,
      }),
    });

    console.log("🔁 [LOGIN] Creating refresh token...");

    await callOrds("/authTokens/create", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(userId),
        token_hash,
        device_id,
        days: process.env.REFRESH_TOKEN_DAYS || 7,
      }),
    });

    console.log("✅ [LOGIN] Success:", { userId });

    return res.json({
      access_token,
      refresh_token,
      profile: {
        user_id: userId,
        company_id: result.out_company_id,
        company_name: result.out_company_name,
      },
    });
  } catch (error) {
    console.error("💥 [LOGIN ERROR]", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({ error: "Login failed" });
  }
}
/* ==========================
   REGISTER
=========================== */
async function register(req, res) {
  try {
    const { user_email, password, ...rest } = req.body;

    console.log("🟡 [REGISTER] Incoming:", req.body);

    if (!user_email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const payload = {
      ...rest,
      user_email, // ✅ FIX
      password_hash: hashedPassword, // ✅ FIX
    };

    console.log("📤 [REGISTER] Sending to ORDS:", {
      ...payload,
      password_hash: hashedPassword.slice(0, 10) + "...",
    });

    const result = await callOrds("/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log(
      "📥 [REGISTER] ORDS response:",
      JSON.stringify(result, null, 2),
    );

    return res.json(result);
  } catch (error) {
    console.error("💥 [REGISTER ERROR]", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ error: "Registration failed" });
  }
}

/* ===========================
   REFRESH ACCESS TOKEN
=========================== */
async function refresh(req, res) {
  try {
    const { refresh_token, device_id } = req.body;

    if (!refresh_token || !device_id) {
      return res.status(400).json({ error: "Missing refresh data" });
    }

    const token_hash = hashToken(refresh_token);

    const result = await callOrds("/authTokens/validate", {
      method: "POST",
      body: JSON.stringify({
        token_hash,
        device_id,
      }),
    });

    console.log("🔁 [REFRESH] ORDS validate result:", result);

    if (!result?.user_id) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const userId = result.user_id;

    const companyId =
      result.company_id || result.out_company_id || result.outCompanyId;

    if (!companyId) {
      console.error("❌ [REFRESH] Missing company_id from ORDS:", result);
      return res.status(401).json({
        error: "Missing company context",
      });
    }

    await callOrds("/authTokens/revoke", {
      method: "POST",
      body: JSON.stringify({ token_hash, device_id }),
    });

    const newRefreshToken = crypto.randomBytes(64).toString("hex");
    const newHash = hashToken(newRefreshToken);

    await callOrds("/authTokens/create", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(userId),
        token_hash: newHash,
        device_id,
        days: process.env.REFRESH_TOKEN_DAYS || 7,
      }),
    });

    const access_token = signAccessToken({
      sub: String(userId),
      company_id: companyId,
      role: "user",
    });

    return res.json({
      access_token,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    console.error("refresh error:", error.message);
    res.status(500).json({ error: "Refresh failed" });
  }
}

async function logout(req, res) {
  try {
    const { refresh_token, device_id } = req.body;

    if (!refresh_token || !device_id) {
      return res.status(400).json({ error: "Missing logout data" });
    }

    const token_hash = hashToken(refresh_token);

    await callOrds("/authTokens/revoke", {
      method: "POST",
      body: JSON.stringify({
        token_hash,
        device_id,
      }),
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("logout error:", error.message);
    res.status(500).json({ error: "Logout failed" });
  }
}

async function deleteAccount(req, res) {
  try {
    const user_id = req.user.id; // comes from JWT via authMiddleware
    console.log("Deleting account for user_id:", user_id);
    await callOrds(`/deleteAccount?user_id=${user_id}`, {
      method: "POST",
    });

    return res.status(204).send(); // No content (standard)
  } catch (error) {
    // console.error("==== DELETE ACCOUNT ERROR ====");
    // console.error("Message:", error);
    // res.status(500).json({
    //   error: "Account deletion failed",
    //   details: error.response?.data || error.message,
    // });
  }
}

async function sendOtp(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    await callOrds("/sendOtp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    return res.json({
      message: "If account exists, OTP sent",
    });
  } catch (error) {
    console.error("sendOtp error:", error.message);
    res.status(500).json({ error: "Failed to send OTP" });
  }
}
async function verifyOtp(req, res) {
  try {
    const { email, otp_code } = req.body;

    console.log("🔐 [VERIFY OTP] Incoming request:", {
      email,
      otp_code,
    });

    if (!email || !otp_code) {
      console.warn("⚠️ [VERIFY OTP] Missing data", { email, otp_code });
      return res.status(400).json({ error: "Missing data" });
    }

    const result = await callOrds("/verifyOtp", {
      method: "POST",
      body: JSON.stringify({ email, otp_code }),
    });

    console.log(
      "📦 [VERIFY OTP] ORDS raw response:",
      JSON.stringify(result, null, 2),
    );

    const verificationStatus =
      result?.verification_status || result?.items?.[0]?.verification_status;

    console.log("🔎 [VERIFY OTP] Parsed status:", verificationStatus);

    if (verificationStatus !== "VERIFIED") {
      console.warn("❌ [VERIFY OTP] Invalid OTP", {
        email,
        otp_code,
        verificationStatus,
      });

      return res.status(400).json({
        error: "Invalid or expired OTP",
      });
    }

    console.log("✅ [VERIFY OTP] Success", { email });

    return res.json({ verification_status: "VERIFIED" });
  } catch (error) {
    console.error("💥 [VERIFY OTP ERROR]", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({ error: "OTP verification failed" });
  }
}
async function resetPassword(req, res) {
  try {
    const { email, new_password } = req.body;

    console.log("🟡 [RESET] Incoming:", { email });

    if (!email || !new_password) {
      console.warn("⚠️ [RESET] Missing data");
      return res.status(400).json({ error: "Missing data" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    console.log("🔐 [RESET] Password hashed:", {
      email,
      hashPreview: hashedPassword.slice(0, 10) + "...",
    });

    const result = await callOrds("/resetPassword", {
      method: "POST",
      body: JSON.stringify({
        email,
        new_password: hashedPassword,
      }),
    });

    console.log("📥 [RESET] ORDS response:", JSON.stringify(result, null, 2));

    const responseMessage =
      result?.response_message || result?.items?.[0]?.response_message;

    console.log("🔎 [RESET] Parsed response:", responseMessage);

    if (responseMessage !== "SUCCESS") {
      console.warn("❌ [RESET] Failed:", responseMessage);
      return res.status(400).json({
        error: responseMessage || "Reset failed",
      });
    }

    console.log("✅ [RESET] Success:", { email });

    return res.json({ message: "Password updated" });
  } catch (error) {
    console.error("💥 [RESET ERROR]", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({ error: "Password reset failed" });
  }
}

module.exports = {
  login,
  register,
  refresh,
  logout,
  deleteAccount,
  sendOtp,
  verifyOtp,
  resetPassword,
};
