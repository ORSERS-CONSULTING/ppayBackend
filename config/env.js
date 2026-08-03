require("dotenv").config();
const { getSecret } = require("./vault");

const required = async (name, vaultOcidEnvVar) => {
  if (process.env[name]) return process.env[name];

  const secretOcid = process.env[vaultOcidEnvVar];
  if (secretOcid) {
    return await getSecret(secretOcid);
  }

  throw new Error(`Missing config: ${name}`);
};

async function loadConfig() {
  return {
    PORT: process.env.PORT || 3000,

    // Non-secret config
    ORDS_BASE_URL: process.env.ORDS_BASE_URL,
    ORDS_TOKEN_URL: process.env.ORDS_TOKEN_URL,
    REFRESH_TOKEN_DAYS: process.env.REFRESH_TOKEN_DAYS,
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL,
    // Secrets (Vault-backed)
    ORDS_CLIENT_ID: await required(
      "ORDS_CLIENT_ID",
      "ORDS_CLIENT_ID_OCID"
    ),
    ORDS_CLIENT_SECRET: await required(
      "ORDS_CLIENT_SECRET",
      "ORDS_CLIENT_SECRET_OCID"
    ),

    JWT_SECRET: await required(
      "JWT_SECRET",
      "JWT_SECRET_OCID"
    ),

    REFRESH_TOKEN_PEPPER: await required(
      "REFRESH_TOKEN_PEPPER",
      "REFRESH_TOKEN_PEPPER_OCID"
    ),
  };
}

module.exports = loadConfig;
