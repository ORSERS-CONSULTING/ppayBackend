const jwt = require("jsonwebtoken");

const ISS = "ppay-backend";
const AUD = "ppay-app";

const DEFAULT_TTL = process.env.ACCESS_TOKEN_TTL;

function signAccessToken(payload, expiresIn = DEFAULT_TTL) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    issuer: ISS,
    audience: AUD,
    expiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: ISS,
    audience: AUD,
  });
}

module.exports = { signAccessToken, verifyAccessToken };
