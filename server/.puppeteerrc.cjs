// Download only chrome-headless-shell, into server/.cache.
const { join } = require("node:path");

module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
  chrome: { skipDownload: true },
  "chrome-headless-shell": { skipDownload: false },
};
