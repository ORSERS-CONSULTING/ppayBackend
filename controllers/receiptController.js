const { callOrds } = require("../services/ordsService");
const { getOrdsAccessToken } = require("../services/oauthService");

async function createReceipt(req, res) {
  try {
    console.log("========== CREATE RECEIPT req.user ==========");
    console.log(req.user);

    console.log("========== CREATE RECEIPT incoming body ==========");
    console.log(req.body);

    const user_id = req.user?.id;
    const company_id = req.user?.company_id || req.user?.companyId;

    if (!user_id || !company_id) {
      console.log("========== CREATE RECEIPT MISSING CONTEXT ==========");
      console.log({ user_id, company_id });

      return res.status(401).json({
        error: "Missing user or company context",
      });
    }

    const body = {
      ...req.body,
      user_id,
      company_id,
    };

    console.log("========== CREATE RECEIPT body sent to ORDS ==========");
    console.log(body);

    const result = await callOrds("/receipts", {
      method: "POST",
      body,
    });

    console.log("========== CREATE RECEIPT ORDS RESULT ==========");
    console.log(JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error("createReceipt error:", error);

    res.status(500).json({
      error: "Failed to create receipt",
      detail: error.message,
    });
  }
}

async function listReceipts(req, res) {
  try {
    const user_id = req.user?.id;

    // Safe pagination defaults
    const offset = Math.max(0, Number(req.query.offset || 0));

    const limit = Math.min(Math.max(1, Number(req.query.limit || 50)), 100);

    const queryParams = {
      ...req.query,

      // force secure values
      user_id,

      // sanitized pagination
      offset,
      limit,
    };

    const queryString = new URLSearchParams(queryParams).toString();

    console.log("========== LIST PARAMS ==========");
    console.log(queryParams);

    console.log("========== FINAL ORDS URL ==========");
    console.log(`/receipts?${queryString}`);

    const result = await callOrds(`/receipts?${queryString}`, {
      method: "GET",
    });

    res.json(result);
  } catch (error) {
    console.error("listReceipts error:", error);

    res.status(500).json({
      error: "Failed to fetch receipts",
    });
  }
}
async function countReceipts(req, res) {
  try {
    const user_id = req.user?.id;

    const company_id = req.user?.company_id || req.user?.companyId;

    const queryParams = {
      ...req.query,

      // force secure values
      user_id,
      company_id,
    };

    const queryString = new URLSearchParams(queryParams).toString();

    console.log("========== COUNT RECEIPTS PARAMS ==========");
    console.log(queryParams);

    console.log("========== FINAL ORDS URL ==========");
    console.log(`/countReceipts?${queryString}`);

    const result = await callOrds(`/countReceipts?${queryString}`, {
      method: "GET",
    });

    res.json(result);
  } catch (error) {
    console.error("countReceipts error:", error);

    res.status(500).json({
      error: "Failed to fetch receipt counts",
    });
  }
}
async function getReceiptDetails(req, res) {
  try {
    console.log("========== REQ.USER ==========");
    console.log(req.user);

    // support both camelCase and snake_case
    const company_id = req.user?.company_id || req.user?.companyId;

    const { receipt_no, short_code, receipt_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        error: "Missing company context",
      });
    }

    if (!receipt_no && !short_code && !receipt_id) {
      return res.status(400).json({
        error: "Missing receipt identifier",
      });
    }

    const params = new URLSearchParams({
      company_id: String(company_id),
    });

    if (receipt_id) {
      params.append("receipt_id", String(receipt_id));
    } else if (short_code) {
      params.append("short_code", String(short_code));
    } else {
      params.append("receipt_no", String(receipt_no));
    }

    console.log("========== RECEIPT DETAILS PARAMS ==========");
    console.log(params.toString());

    const ordsUrl = `/receiptDetails?${params.toString()}`;

    console.log("========== ORDS URL ==========");
    console.log(ordsUrl);

    const result = await callOrds(ordsUrl, {
      method: "GET",
    });

    console.log("========== ORDS RESULT ==========");
    console.log(JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error("getReceiptDetails error:", error);

    res.status(500).json({
      error: "Failed to fetch receipt details",
    });
  }
}
async function voidReceipt(req, res) {
  try {
    const user_id = req.user?.id;

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
    console.log("uploadReceiptPdf → received file:", {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });
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
    console.log("uploadReceiptPdf → ORDS response:", result);
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
      result?.response_message || result?.items?.[0]?.response_message;

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

async function listProducts(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id || req.user?.companyId;

    if (!user_id || !company_id) {
      return res.status(401).json({ error: "Missing user or company context" });
    }

    const queryParams = {
      ...req.query,
      user_id,
      company_id,
    };

    const queryString = new URLSearchParams(queryParams).toString();

    const result = await callOrds(`/products?${queryString}`, {
      method: "GET",
    });

    res.json(result);
  } catch (error) {
    console.error("listProducts error:", error.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
}

async function createProduct(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id || req.user?.companyId;

    if (!user_id || !company_id) {
      return res.status(401).json({ error: "Missing user or company context" });
    }

    const body = {
      ...req.body,
      user_id,
      company_id,
    };

    const result = await callOrds("/products", {
      method: "POST",
      body,
    });

    res.json(result);
  } catch (error) {
    console.error("createProduct error:", error.message);
    res.status(500).json({ error: "Failed to create product" });
  }
}

async function updateProduct(req, res) {
  try {
    console.log("========== UPDATE PRODUCT req.user ==========");
    console.log(req.user);

    console.log("========== UPDATE PRODUCT params ==========");
    console.log(req.params);

    console.log("========== UPDATE PRODUCT incoming body ==========");
    console.log(req.body);

    const user_id = req.user?.id;
    const company_id = req.user?.company_id || req.user?.companyId;

    if (!user_id || !company_id) {
      console.log("========== UPDATE PRODUCT MISSING CONTEXT ==========");
      console.log({ user_id, company_id });

      return res.status(401).json({
        error: "Missing user or company context",
      });
    }

    const body = {
      ...req.body,
      id: req.params.id,
      user_id,
      company_id,
    };

    console.log("========== UPDATE PRODUCT body sent to ORDS ==========");
    console.log(body);

    const result = await callOrds("/products", {
      method: "PUT",
      body,
    });

    console.log("========== UPDATE PRODUCT ORDS RESULT ==========");
    console.log(JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error("updateProduct error:", error);

    res.status(500).json({
      error: "Failed to update product",
      detail: error.message,
    });
  }
}

async function deactivateProduct(req, res) {
  try {
    console.log("========== DEACTIVATE PRODUCT req.user ==========");
    console.log(req.user);

    console.log("========== DEACTIVATE PRODUCT params ==========");
    console.log(req.params);

    const user_id = req.user?.id;
    const company_id = req.user?.company_id || req.user?.companyId;

    if (!user_id || !company_id) {
      console.log("========== DEACTIVATE PRODUCT MISSING CONTEXT ==========");
      console.log({ user_id, company_id });

      return res.status(401).json({
        error: "Missing user or company context",
      });
    }

    const body = {
      id: req.params.id,
      user_id,
      company_id,
    };

    console.log("========== DEACTIVATE PRODUCT body sent to ORDS ==========");
    console.log(body);

    const result = await callOrds("/products", {
      method: "DELETE",
      body,
    });

    console.log("========== DEACTIVATE PRODUCT ORDS RESULT ==========");
    console.log(JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error("deactivateProduct error:", error);

    res.status(500).json({
      error: "Failed to deactivate product",
      detail: error.message,
    });
  }
}

const XLSX = require("xlsx");
function getValue(row, keys) {
  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== null &&
      String(row[key]).trim() !== ""
    ) {
      return row[key];
    }
  }

  return null;
}

async function importProducts(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id || req.user?.companyId;
    const file = req.file;
    const currency_iso = req.body.currency_iso;

    if (!user_id || !company_id) {
      return res.status(401).json({
        error: "Missing user or company context",
      });
    }

    if (!currency_iso) {
      return res.status(400).json({
        error: "Missing currency",
      });
    }

    if (!file) {
      return res.status(400).json({
        error: "Excel file is required",
      });
    }

    const workbook = XLSX.read(file.buffer, {
      type: "buffer",
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        const name = getValue(row, [
          "Product Name",
          "product name",
          "Product_Name",
          "product_name",
          "Name",
          "name",
        ]);
        const description = getValue(row, [
          "Description",
          "description",
          "Product Description",
          "product description",
          "Product_Description",
          "product_description",
        ]);
        const price = Number(
          getValue(row, [
            "Price",
            "price",
            "Unit Price",
            "unit price",
            "Unit_Price",
            "unit_price",
          ]),
        );
        if (!name) {
          errors.push({
            row: index + 2,
            error: "Missing product name",
          });

          continue;
        }

        if (!Number.isFinite(price) || price <= 0) {
          errors.push({
            row: index + 2,
            error: "Invalid price",
          });

          continue;
        }

        await callOrds("/products", {
          method: "POST",
          body: {
            user_id,
            company_id,
            name,
            description,
            unit_price: price,
            currency_iso: currency_iso,
          },
        });

        imported++;
      } catch (err) {
        errors.push({
          row: index + 2,
          error: err.message,
        });
      }
    }

    return res.json({
      imported,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("importProducts error:", error);

    return res.status(500).json({
      error: "Failed to import products",
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
  uploadReceiptPdf,
  sendReceiptEmailFromDb,
  countReceipts,
  listProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  importProducts,
};
