const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'docs/assets/dashboard-preview.png' });
  await browser.close();
  console.log('Screenshot saved to docs/assets/dashboard-preview.png');
})();
