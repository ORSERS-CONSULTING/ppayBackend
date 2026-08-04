const { getOrdsAccessToken } = require("./oauthService");

async function callOrds(endpoint, options = {}) {
  const token = await getOrdsAccessToken();

  // 1. Build URL
  let url = `${process.env.ORDS_BASE_URL}${endpoint}`;

  if (options.query) {
    const qs = new URLSearchParams(options.query).toString();
    url += `?${qs}`;
  }

  // 2. Headers
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  // 3. Handle body properly
  let body = options.body;

  if (body instanceof Buffer) {
    // ✅ RAW binary (PDF)
    headers["Content-Type"] = headers["Content-Type"] || "application/pdf";
  } else if (body && typeof body === "object") {
    // ✅ JSON
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(body);
  }

  // 4. Request
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body,
  });

  // 5. Response handling (SAFE)
  const contentType = response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { raw: text } : {};
  }

 if (!response.ok) {
  const error = new Error(
    data?.error ||
    data?.message ||
    `ORDS ${response.status}`
  );

  error.response = {
    status: response.status,
    data,
  };

  throw error;
}
  return data;
}

module.exports = { callOrds };