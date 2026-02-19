const loadConfig = require("./config/env");

(async () => {
  try {
    const config = await loadConfig();

    // Inject everything returned from env.js
    Object.entries(config).forEach(([key, value]) => {
      process.env[key] = value;
    });

    const app = require("./index");

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  }
})();
