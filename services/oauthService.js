let cachedToken = null;
let tokenExpiry = null;
async function getOrdsAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  console.log(
    "Requesting new ORDS access token...",
    process.env.ORDS_TOKEN_URL,
  );
  const response = await fetch(process.env.ORDS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.ORDS_CLIENT_ID}:${process.env.ORDS_CLIENT_SECRET}`,
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  const text = await response.text();

  if (!response.ok) {
    console.log("TOKEN STATUS:", response.status);
    console.log("TOKEN BODY:", text);
    throw new Error(`TOKEN ${response.status}: ${text}`);
  }

  const data = JSON.parse(text);

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 30) * 1000;

  return cachedToken;
}

module.exports = { getOrdsAccessToken };
