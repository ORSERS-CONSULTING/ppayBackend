const { callOrds } = require("../services/ordsService");
const { getOrdsAccessToken } = require("../services/oauthService");
const ALLOWED_PROFILE_FIELDS = [
  "full_name",
  "email",
  "phone",
  "company_name",
  "address_line1",
  "address_line2",
  "city",
  "currency_iso",
  "tax_number",
  "default_vat",
  "logo_url",
];

async function createReceipt(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        error: "Unauthorized",
      });
    }

    if (!company_id) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_CONTEXT_MISSING",
        error: "No company is linked to this account",
      });
    }


    const body = {
      ...req.body,
      user_id,
      company_id,
    };

    const result = await callOrds("/receipts", {
      method: "POST",
      body,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create receipt",
      detail: error.message,
    });
  }
}

async function listReceipts(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id =
      req.user?.company_id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        error: "Unauthorized",
      });
    }

    if (!company_id) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_CONTEXT_MISSING",
        error:
          "No company is linked to this account",
      });
    }

    const offset = Math.max(
      0,
      Number(req.query.offset || 0),
    );

    const limit = Math.min(
      Math.max(
        1,
        Number(req.query.limit || 20),
      ),
      100,
    );

    const queryParams = {
      ...req.query,

      // Secure values from JWT/backend context
      company_id,
      user_id,

      offset,
      limit,
    };

    const sanitizedParams =
      Object.fromEntries(
        Object.entries(
          queryParams,
        ).filter(
          ([, value]) =>
            value !== undefined &&
            value !== null &&
            value !== "",
        ),
      );

    const queryString =
      new URLSearchParams(
        sanitizedParams,
      ).toString();

    const result = await callOrds(
      `/receipts?${queryString}`,
      {
        method: "GET",
      },
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error:
        "Failed to fetch receipts",
      detail: error.message,
    });
  }
}

async function countReceipts(req, res) {
  try {
    const user_id = req.user?.id;

    const company_id = req.user?.company_id;

    const queryParams = {
      ...req.query,

      // force secure values
      user_id,
      company_id,
    };

    const queryString = new URLSearchParams(queryParams).toString();

    const result = await callOrds(`/countReceipts?${queryString}`, {
      method: "GET",
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch receipt counts",
    });
  }
}
async function getReceiptDetails(req, res) {
  try {
    // support both camelCase and snake_case
    const company_id = req.user?.company_id;

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

    const ordsUrl = `/receiptDetails?${params.toString()}`;

    const result = await callOrds(ordsUrl, {
      method: "GET",
    });

    res.json(result);
  } catch (error) {
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
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
}
async function uploadLogo(req, res) {
  try {
    const company_id = req.user?.company_id;


    if (!company_id) {
      return res.status(401).json({ error: "Missing company context" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const mimeType = req.file.mimetype;
    const buffer = req.file.buffer;

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

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to upload logo" });
  }
}
async function getLogo(req, res) {
  try {
    const company_id = req.user?.company_id;

    if (!company_id) {
      return res.status(400).json({ error: "Missing company id" });
    }


    const token = await getOrdsAccessToken();
    const url = `${process.env.ORDS_BASE_URL}/getLogo?company_id=${company_id}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return res.status(response.status).end();
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
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
    return res.status(500).json({
      error: "Failed to send receipt email",
    });
  }
}

async function listProducts(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id;

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
    res.status(500).json({ error: "Failed to fetch products" });
  }
}

async function createProduct(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id;

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
    if (error.response) {
      return res.status(error.response.status).json(
        error.response.data
      );
    }

    return res.status(500).json({
      error: "Failed to create product",
    });
  }
}

async function updateProduct(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        error: "Unauthorized",
      });
    }

    if (!company_id) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_CONTEXT_MISSING",
        error: "No company is linked to this account",
      });
    }


    const body = {
      ...req.body,
      id: req.params.id,
      user_id,
      company_id,
    };

    const result = await callOrds("/products", {
      method: "PUT",
      body,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update product",
      detail: error.message,
    });
  }
}

async function deactivateProduct(req, res) {
  try {
    const user_id = req.user?.id;
    const company_id = req.user?.company_id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        error: "Unauthorized",
      });
    }

    if (!company_id) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_CONTEXT_MISSING",
        error: "No company is linked to this account",
      });
    }


    const body = {
      id: req.params.id,
      user_id,
      company_id,
    };

    const result = await callOrds("/products", {
      method: "DELETE",
      body,
    });

    res.json(result);
  } catch (error) {

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
    const company_id = req.user?.company_id;
    const file = req.file;
    const currency_iso = req.body.currency_iso;


    if (!user_id) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        error: "Unauthorized",
      });
    }

    if (!company_id) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_CONTEXT_MISSING",
        error: "No company is linked to this account",
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

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return res.status(400).json({
        error: "Excel file contains no sheets",
      });
    }

    const sheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    });

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

        const rawPrice = getValue(row, [
          "Price",
          "price",
          "Unit Price",
          "unit price",
          "Unit_Price",
          "unit_price",
        ]);

        const price = Number(rawPrice);

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

        const ordsPayload = {
          user_id,
          company_id,
          name,
          description,
          unit_price: price,
          currency_iso,
        };

        const ordsResult = await callOrds("/products", {
          method: "POST",
          body: ordsPayload,
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
    return res.status(500).json({
      error: "Failed to import products",
      detail: error.message,
    });
  }
}

async function updateProfile(req, res) {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        error: "Unauthorized",
      });
    }

    const profileUpdates = {};

    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field,
        )
      ) {
        profileUpdates[field] = req.body[field];
      }
    }

    if (Object.keys(profileUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No profile fields were provided",
      });
    }

    const ordsBody = {
      ...profileUpdates,
      user_id,
    };

    const result = await callOrds("/profile", {
      method: "PUT",
      body: ordsBody,
    });

    return res.json(result);
  } catch (error) {
    const status =
      error.response?.status || 500;

    const ordsData =
      error.response?.data || null;

    return res.status(
      status >= 400 && status < 600
        ? status
        : 500,
    ).json({
      success: false,
      error:
        ordsData?.message ||
        ordsData?.error ||
        ordsData?.raw ||
        "Failed to update profile",
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
  updateProfile,
};
