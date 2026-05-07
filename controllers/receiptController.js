const { callOrds } = require("../services/ordsService");
const { getOrdsAccessToken } = require("../services/oauthService");

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
    const { receipt_no, short_code, receipt_id } = req.query;

    if (!receipt_no && !short_code && !receipt_id) {
      return res.status(400).json({ error: "Missing receipt identifier" });
    }

    const params = new URLSearchParams({
      user_id,
    });

    if (receipt_id) {
      params.append("receipt_id", receipt_id);
    } else if (short_code) {
      params.append("short_code", short_code);
    } else {
      params.append("receipt_no", receipt_no);
    }

    const result = await callOrds(`/receiptDetails?${params.toString()}`, {
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
    const company_id = req.user?.company_id;

    console.log("uploadLogo → company:", company_id);

    if (!company_id) {
      return res.status(401).json({ error: "Missing company context" });
    }

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

    console.log("uploadLogo → sending to ORDS");

    const result = await callOrds("/uploadLogo", {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
      },
      query: {
        company_id, // 🔥 CLEAN WAY
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
    const company_id = req.user?.company_id || req.query.company_id;

if (!company_id) {
  return res.status(400).json({ error: "Missing company id" });
}

console.log("getLogo → company:", company_id);


    const token = await getOrdsAccessToken();
    const url = `${process.env.ORDS_BASE_URL}/getLogo?company_id=${company_id}`;
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
// async function sendReceiptEmail(req, res) {
//   console.log("📍 [CONTROLLER ENTRY] req.user:", req.user);
//   try {
//     const receipt_id = req.body.receipt_id;
//     const company_id = req.user?.company_id;
    
//     const file = req.file;

//     console.log("📧 [SEND RECEIPT EMAIL] Incoming:", {
//       receipt_id,
//       company_id,
//       hasFile: !!file,
//       filename: file?.originalname,
//       size: file?.size,
//       mimetype: file?.mimetype,
//     });

//     if (!receipt_id || !company_id || !file) {
//       return res.status(400).json({
//         error: "Missing receipt_id, company_id, or PDF file",
//       });
//     }
// const base64Pdf = file.buffer.toString("base64");
// console.log("📧 [SEND RECEIPT EMAIL] Converted PDF to base64, size:", base64Pdf.length);
// const result = await callOrds("/sendReceiptEmail", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/pdf", // 🔥 important
//   },
//   query: {
//     receipt_id,
//     company_id,
//   },
//   body: file.buffer, // 🔥 RAW BUFFER
// });
// console.log("hello");
//     // const result; = await callOrds("/sendReceiptEmail", {
//     //   method: "POST",
//     //   headers: {
//     //     "Content-Type": "application/pdf",
//     //   },
//     //   query: {
//     //     receipt_id,
//     //     company_id,
//     //   },
//     //   body: file.buffer,
//     // });

//     // console.log("📥 [SEND RECEIPT EMAIL] ORDS response:", result);

//     const responseMessage =
//       result?.response_message ||
//       result?.items?.[0]?.response_message;
// console.log("📧 result:", result);
//     if (responseMessage !== "SUCCESS") {
//       return res.status(400).json({
//         error: responseMessage || "Email send failed",
//       });
//     }

//     return res.json({
//       message: "Receipt email sent successfully",
//     });
//   } catch (error) {
//     console.error("💥 [SEND RECEIPT EMAIL ERROR]", {
//       message: error.message,
//       stack: error.stack,
//     });

//     return res.status(500).json({
//       error: "Failed to send receipt email",
//     });
//   }
// }
async function uploadReceiptPdf(req, res) {
  try {
    const receipt_id = req.body.receipt_id;
    const company_id = req.user?.company_id;
    const file = req.file;

    if (!receipt_id || !company_id || !file) {
      return res.status(400).json({
        error: "Missing receipt_id, company_id, or PDF file",
      });
    }

    if (file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    const result = await callOrds("/uploadReceiptPdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
      },
      query: {
        receipt_id,
        company_id,
        file_name: file.originalname,
      },
      body: file.buffer,
    });

    const responseMessage =
      result?.response_message || result?.items?.[0]?.response_message;

    if (responseMessage !== "SUCCESS") {
      return res.status(400).json({
        error: responseMessage || "PDF upload failed",
      });
    }

    return res.json({
      message: "Receipt PDF stored successfully",
    });
  } catch (error) {
    console.error("uploadReceiptPdf error:", error);
    return res.status(500).json({
      error: "Failed to upload receipt PDF",
    });
  }
}
async function sendReceiptEmailFromDb(req, res) {
  try {
    const receipt_id = req.body.receipt_id;
    const company_id = req.user?.company_id;

    if (!receipt_id || !company_id) {
      return res.status(400).json({
        error: "Missing receipt_id or company_id",
      });
    }

    const result = await callOrds("/sendReceiptEmail", {
      method: "POST",
      body: {
        receipt_id,
        company_id,
      },
    });

    const responseMessage =
      result?.response_message ||
      result?.items?.[0]?.response_message;

    if (responseMessage !== "SUCCESS") {
      return res.status(400).json({
        error: responseMessage || "Email failed",
      });
    }

    return res.json({
      message: "Receipt email sent successfully",
    });
  } catch (error) {
    console.error("sendReceiptEmailFromDb error:", error);
    return res.status(500).json({
      error: "Failed to send receipt email",
    });
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
  uploadReceiptPdf, // Reusing the same function for simplicity
  sendReceiptEmailFromDb,
};
