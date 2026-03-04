const { callOrds } = require("../services/ordsService");
const { getOrdsAccessToken } = require("../utils/ordsAuth");
async function createReceipt(req, res) {
  try {
    const user_id = req.user.id;

    const result = await callOrds("/receipts", {
      method: "POST",
      body: JSON.stringify({
        ...req.body,
        user_id, // override user_id from token
      }),
    });

    res.json(result);
  } catch (error) {
    console.error("createReceipt error:", error.message);
    res.status(500).json({ error: "Failed to create receipt" });
  }
}

async function listReceipts(req, res) {
  try {
    const user_id = req.user.id;

    const queryString = new URLSearchParams({
      ...req.query,
      user_id, // force user_id from JWT
    }).toString();

    const result = await callOrds(`/receipts?${queryString}`, {
      method: "GET",
    });

    res.json(result);
  } catch (error) {
    console.error("listReceipts error:", error.message);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
}

async function getReceiptDetails(req, res) {
  try {
    const user_id = req.user.id;

    const queryString = new URLSearchParams({
      ...req.query,
      user_id,
    }).toString();

    const result = await callOrds(`/receiptDetails?${queryString}`, {
      method: "GET",
    });

    res.json(result);
  } catch (error) {
    console.error("getReceiptDetails error:", error.message);
    res.status(500).json({ error: "Failed to fetch receipt details" });
  }
}

async function voidReceipt(req, res) {
  try {
    const user_id = req.user.id;

    const queryString = new URLSearchParams({
      ...req.query,
      user_id,
    }).toString();

    const result = await callOrds(`/voidReceipt?${queryString}`, {
      method: "POST",
    });

    res.json(result);
  } catch (error) {
    console.error("voidReceipt error:", error.message);
    res.status(500).json({ error: "Failed to void receipt" });
  }
}
async function getPublicReceipt(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Missing receipt code" });
    }

    const queryString = new URLSearchParams({
      short_code: code,
      tz: "UTC", // or allow param
    }).toString();

    const result = await callOrds(`/publicReceipts?${queryString}`, {
      method: "GET",
    });

    if (!result || !result.items || result.items.length === 0) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const receipt = result.items[0];

    res.json(receipt);
  } catch (error) {
    console.error("getPublicReceipt error:", error.message);
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
}
async function uploadLogo(req, res) {
  try {
    const user_id = req.user?.id;
    console.log("uploadLogo → user:", user_id);

    if (!req.file) {
      console.log("uploadLogo → no file received");
      return res.status(400).json({ error: "No image uploaded" });
    }

    console.log("uploadLogo → file:", {
      type: req.file.mimetype,
      size: req.file.size,
    });

    const mimeType = req.file.mimetype;
    const buffer = req.file.buffer;

    const queryString = new URLSearchParams({
      user_id,
    }).toString();

    console.log("uploadLogo → sending to ORDS");

    const result = await callOrds(`/uploadLogo?${queryString}`, {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
      },
      body: buffer,
    });

    console.log("uploadLogo → ORDS success");

    res.json(result);
  } catch (error) {
    console.error("uploadLogo error:", error.message);
    res.status(500).json({ error: "Failed to upload logo" });
  }
}
async function getLogo(req, res) {
  try {
    const user_id = req.user?.id || req.query.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user id" });
    }

    console.log("getLogo → user:", user_id);

    const token = await getOrdsAccessToken();
    const url = `${process.env.ORDS_BASE_URL}/getLogo?user_id=${user_id}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.log("getLogo → ORDS failed:", response.status);
      return res.status(response.status).end();
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("getLogo error:", error.message);
    res.status(500).json({ error: "Failed to fetch logo" });
  }
}
module.exports = {
  createReceipt,
  listReceipts,
  getReceiptDetails,
  voidReceipt,
  getPublicReceipt,
  uploadLogo,
  getLogo,
};
