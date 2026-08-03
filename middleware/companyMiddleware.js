function requireCompany(req, res, next) {
  const company_id = req.user?.company_id;

  if (!company_id) {
    return res.status(403).json({
      success: false,
      code: "COMPANY_CONTEXT_MISSING",
      message: "No company is linked to this account",
    });
  }

  return next();
}

module.exports = { requireCompany };