// config/vault.js
const {
  InstancePrincipalsAuthenticationDetailsProviderBuilder,
} = require("oci-common");
const { SecretsClient } = require("oci-secrets");

async function getSecret(secretOcid) {
  if (!secretOcid) throw new Error("secret OCID missing");
  const provider =
    await new InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
  const client = new SecretsClient({ authenticationDetailsProvider: provider });
  client.regionId = process.env.OCI_REGION || "me-dubai-1";

  const { secretBundle } = await client.getSecretBundle({
    secretId: secretOcid,
    stage: "CURRENT",
  });

  const b64 = secretBundle.secretBundleContent.content;
  return Buffer.from(b64, "base64").toString("utf8");
}

module.exports = { getSecret };
