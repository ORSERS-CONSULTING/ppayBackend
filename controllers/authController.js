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

function decodeJwtPayloadWithoutVerify(token) {
  try {
    const payloadPart = token.split(".")[1];

    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      normalized.length +
      ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    return JSON.parse(
      Buffer.from(
        padded,
        "base64",
      ).toString("utf8"),
    );
  } catch (error) {
    return null;
  }
}

function logAccessTokenTiming(label, token) {
  const payload =
    decodeJwtPayloadWithoutVerify(token);

  if (!payload) {
    console.log(`${label}: unable to decode token`);
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  console.log(label, {
    sub: payload.sub,
    company_id: payload.company_id,
    issued_at: payload.iat,
    expires_at: payload.exp,
    now,
    remaining_seconds:
      typeof payload.exp === "number"
        ? payload.exp - now
        : null,
  });
}

async function login(req, res) {
  try {
    const { email, password, device_id } = req.body;


    if (!email || !password || !device_id) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const result = await callOrds("/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const userId = result?.out_user_id;
    const passwordHash = result?.out_password_hash;

    if (!userId || !passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, passwordHash);


    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const access_token = signAccessToken({
      sub: String(userId),
      company_id: result.out_company_id, // 🔥 comes from ORDS
      role: "user",
    });

    logAccessTokenTiming(
      "✅ [LOGIN] New access token",
      access_token,
    );

    const refresh_token = crypto.randomBytes(64).toString("hex");
    const token_hash = hashToken(refresh_token);


    await callOrds("/authTokens/revokeByUserDevice", {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(userId),
        device_id,
      }),
    });


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
    res.status(500).json({ error: "Login failed" });
  }
}
/* ==========================
   REGISTER
=========================== */
async function register(req, res) {
  try {
    const { user_email, password, ...rest } = req.body;

    if (!user_email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const payload = {
      ...rest,
      user_email, // ✅ FIX
      password_hash: hashedPassword, // ✅ FIX
    };

    const result = await callOrds("/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Registration failed" });
  }
}

/* ===========================
   REFRESH ACCESS TOKEN
=========================== */
async function refresh(req, res) {
  try {
    const {
      refresh_token,
      device_id,
    } = req.body;

    console.log(
      "========== REFRESH START ==========",
    );

    console.log({
      has_refresh_token:
        Boolean(refresh_token),
      device_id,
    });

    if (
      !refresh_token ||
      !device_id
    ) {
      return res.status(400).json({
        error: "Missing refresh data",
      });
    }

    const token_hash =
      hashToken(refresh_token);

    const result = await callOrds(
      "/authTokens/validate",
      {
        method: "POST",
        body: JSON.stringify({
          token_hash,
          device_id,
        }),
      },
    );

    console.log(
      "🔁 [REFRESH] ORDS validate result:",
      {
        user_id: result?.user_id,
        company_id:
          result?.company_id ||
          result?.out_company_id ||
          result?.outCompanyId,
      },
    );

    if (!result?.user_id) {
      console.log(
        "❌ [REFRESH] Invalid refresh token",
      );

      return res.status(401).json({
        error: "Invalid refresh token",
      });
    }

    const userId =
      result.user_id;

    const companyId =
      result.company_id ||
      result.out_company_id ||
      result.outCompanyId;

    if (!companyId) {
      console.log(
        "❌ [REFRESH] Missing company context",
      );

      return res.status(401).json({
        error:
          "Missing company context",
      });
    }

    await callOrds(
      "/authTokens/revoke",
      {
        method: "POST",
        body: JSON.stringify({
          token_hash,
          device_id,
        }),
      },
    );

    const newRefreshToken =
      crypto
        .randomBytes(64)
        .toString("hex");

    const newHash =
      hashToken(newRefreshToken);

    await callOrds(
      "/authTokens/create",
      {
        method: "POST",
        body: JSON.stringify({
          user_id:
            Number(userId),
          token_hash:
            newHash,
          device_id,
          days:
            process.env
              .REFRESH_TOKEN_DAYS ||
            7,
        }),
      },
    );

    const access_token =
      signAccessToken({
        sub: String(userId),
        company_id:
          Number(companyId),
        role: "user",
      });

    logAccessTokenTiming(
      "✅ [REFRESH] New access token",
      access_token,
    );

    console.log(
      "========== REFRESH COMPLETE ==========",
    );

    return res.json({
      access_token,
      refresh_token:
        newRefreshToken,
    });
  } catch (error) {
    console.error(
      "❌ [REFRESH ERROR]",
      {
        name: error?.name,
        message:
          error?.message,
        status:
          error?.response?.status,
        data:
          error?.response?.data,
      },
    );

    return res.status(500).json({
      error: "Refresh failed",
    });
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
    res.status(500).json({ error: "Logout failed" });
  }
}

async function deleteAccount(req, res) {
  try {
    const user_id = req.user.id; // comes from JWT via authMiddleware
    await callOrds(`/deleteAccount?user_id=${user_id}`, {
      method: "POST",
    });

    return res.status(204).send(); // No content (standard)
  } catch (error) {
    res.status(500).json({
      error: "Account deletion failed",
      details: error.response?.data || error.message,
    });
  }
}

async function sendOtp(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const response = await callOrds("/sendOtp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    return res.json({
      message: "If account exists, OTP sent",
    });
  } catch (error) {
    if (error.response?.data) {
      console.error(
        "❌ ORDS response:",
        error.response.data
      );
    }

    return res.status(500).json({
      error: "Failed to send OTP",
    });
  }
}
async function verifyOtp(req, res) {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({
        error: "Missing data",
      });
    }

    const payload = {
      email,
      otp_code,
    };

    const result = await callOrds("/verifyOtp", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const verificationStatus =
      result?.verification_status ||
      result?.items?.[0]?.verification_status;

    if (verificationStatus !== "VERIFIED") {
      return res.status(400).json({
        error: "Invalid or expired OTP",
      });
    }

    return res.json({
      verification_status: "VERIFIED",
    });
  } catch (error) {
    if (error.response) {
      console.error(
        "Status:",
        error.response.status
      );

      console.error(
        "Response:",
        error.response.data
      );
    }

    return res.status(500).json({
      error: "OTP verification failed",
    });
  }
}
async function resetPassword(req, res) {
  try {
    const { email, new_password } = req.body;

    if (!email || !new_password) {
      return res.status(400).json({ error: "Missing data" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const result = await callOrds("/resetPassword", {
      method: "POST",
      body: JSON.stringify({
        email,
        new_password: hashedPassword,
      }),
    });

    const responseMessage =
      result?.response_message || result?.items?.[0]?.response_message;

    if (responseMessage !== "SUCCESS") {
      return res.status(400).json({
        error: responseMessage || "Reset failed",
      });
    }


    return res.json({ message: "Password updated" });
  } catch (error) {
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
