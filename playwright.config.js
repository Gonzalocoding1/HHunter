/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: "./tests",
  timeout: 45000,
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  }
};
