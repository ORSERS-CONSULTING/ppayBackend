const { verifyAccessToken } = require("../utils/jwt");

function authUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token)
      return res.status(401).json({ message: "Missing token" });

    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { authUser };
