const { getOrdsAccessToken } = require("./oauthService");
async function callOrds(endpoint, options = {}) {
  const token = await getOrdsAccessToken();

  const fullUrl = `${process.env.ORDS_BASE_URL}${endpoint}`;
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
...(options.headers ? {} : options.body ? { "Content-Type": "application/json" } : {}),    },
  });

  const buffer = await response.arrayBuffer();

  const responseText = Buffer.from(buffer).toString();

  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    console.log("ORDS STATUS:", response.status);
    throw new Error(`ORDS ${response.status}: ${responseText}`);
  }

  return data;
}

module.exports = { callOrds };
