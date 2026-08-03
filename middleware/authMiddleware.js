const { verifyAccessToken } = require("../utils/jwt");

function authUser(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";

  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : "";

  /*
   * No access token was supplied.
   * The frontend should try refresh, or log out if refresh is unavailable.
   */
  if (!token) {
    return res.status(401).json({
      success: false,
      code: "SESSION_EXPIRED",
      message: "Authentication token is missing",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    /*
     * A valid application access token must contain the user ID in sub.
     */
    if (!payload?.sub) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        message: "Invalid authentication token",
      });
    }

    req.user = {
      id: Number(payload.sub),
      role: payload.role || "user",
      email: payload.email || null,
      company_id: payload.company_id
        ? Number(payload.company_id)
        : null,
    };

    return next();
  } catch (error) {
    console.error("❌ [AUTH ERROR]", {
      name: error.name,
      message: error.message,
    });

    /*
     * Access token expired normally.
     * The frontend should call the refresh endpoint.
     */
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        message: "Access token has expired",
      });
    }

    /*
     * Invalid signature, wrong issuer, wrong audience,
     * malformed token, or another JWT validation failure.
     */
    return res.status(401).json({
      success: false,
      code: "SESSION_EXPIRED",
      message: "Invalid authentication token",
    });
  }
}

module.exports = { authUser };