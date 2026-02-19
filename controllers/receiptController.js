const { callOrds } = require("../services/ordsService");
async function createReceipt(req, res) {
  try {
    const user_id = req.user.id;

    const result = await callOrds("/receipts", {
      method: "POST",
      body: JSON.stringify({
        ...req.body,
        user_id,   // override user_id from token
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

    const result = await callOrds(
      `/receipts?${queryString}`,
      { method: "GET" }
    );

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

    const result = await callOrds(
      `/receiptDetails?${queryString}`,
      { method: "GET" }
    );

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

    const result = await callOrds(
      `/voidReceipt?${queryString}`,
      { method: "POST" }
    );

    res.json(result);
  } catch (error) {
    console.error("voidReceipt error:", error.message);
    res.status(500).json({ error: "Failed to void receipt" });
  }
}

module.exports = {
  createReceipt,
  listReceipts,
  getReceiptDetails,
  voidReceipt,
};
