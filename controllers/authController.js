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

async function login(req, res) {
  try {
    const { email, password, device_id } = req.body;

    if (!email || !password || !device_id) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const result = await callOrds("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const userId = result?.out_user_id || result?.OUT_USER_ID;

    if (!userId) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const access_token = signAccessToken({
      sub: String(userId),
      role: "user",
    });

    const refresh_token = crypto.randomBytes(64).toString("hex");
    const token_hash = hashToken(refresh_token);

    await callOrds("/authTokens/create", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(userId),
        token_hash,
        device_id,
        days: process.env.REFRESH_TOKEN_DAYS || 7,
      }),
    });

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
    console.error("login error:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
}

/* ===========================
   REGISTER
=========================== */
async function register(req, res) {
  try {
    const result = await callOrds("/register", {
      method: "POST",
      body: JSON.stringify(req.body),
    });

    res.json(result);
  } catch (error) {
    console.error("register error:", error.message);
    res.status(500).json({ error: "Registration failed" });
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

    if (!result?.user_id) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const userId = result.user_id;

    // 🔁 OPTIONAL (Recommended): Rotate refresh token
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

/* ===========================
   LOGOUT
=========================== */
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
/* ===========================
   DELETE ACCOUNT (Protected)
=========================== */
async function deleteAccount(req, res) {
  try {
    const user_id = req.user.id; // comes from JWT via authMiddleware

    await callOrds("/deleteAccount", {
      method: "DELETE",
      body: JSON.stringify({
        user_id,
      }),
    });

    return res.status(204).send(); // No content (standard)

  } catch (error) {
    console.error("deleteAccount error:", error.message);
    res.status(500).json({ error: "Account deletion failed" });
  }
}

module.exports = { login, register, refresh, logout, deleteAccount };