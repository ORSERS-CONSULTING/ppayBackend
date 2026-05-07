const { getOrdsAccessToken } = require("./oauthService");

async function callOrds(endpoint, options = {}) {
  const token = await getOrdsAccessToken();

  // ✅ 1. Build URL with optional query params
  let url = `${process.env.ORDS_BASE_URL}${endpoint}`;

  if (options.query) {
    const qs = new URLSearchParams(options.query).toString();
    url += `?${qs}`;
  }

  // ✅ 2. Prepare headers
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  // ✅ 3. Only set JSON header if:
  // - body exists
  // - no content-type already set
  // - body is NOT a Buffer (i.e. not PDF)
  if (
    options.body &&
    !headers["Content-Type"] &&
    !(options.body instanceof Buffer)
  ) {
    headers["Content-Type"] = "application/json";
  }

  // ✅ 4. Make request
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  // ✅ 5. Read response
  const buffer = await response.arrayBuffer();
  const responseText = Buffer.from(buffer).toString();

  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { raw: responseText };
  }

  // ✅ 6. Error handling (improved logging)
  if (!response.ok) {
    console.log("❌ ORDS STATUS:", response.status);
    console.log("❌ ORDS BODY:", responseText);
    throw new Error(`ORDS ${response.status}: ${responseText}`);
  }

  return data;
}

module.exports = { callOrds };