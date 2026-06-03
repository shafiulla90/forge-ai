const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching automated browser session...");
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: "new"
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    console.log("Navigating to Salesforce Login...");
    await page.goto('https://login.salesforce.com/');

    console.log("Entering credentials...");
    await page.waitForSelector('#username');
    await page.type('#username', 'forgeai@dev.com');
    await page.type('#password', 'Svihaanraj@1432');

    console.log("Clicking login...");
    await Promise.all([
      page.click('#Login'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => console.log("Navigation timeout but continuing...")),
    ]);
    
    // allow Lightning to load
    await new Promise(r => setTimeout(r, 10000));
    const url = page.url();
    console.log("Current URL: ", url);

    await page.screenshot({ path: 'salesforce_auto_login.png' });
    console.log("Took screenshot of the login result and saved to salesforce_auto_login.png.");

    await browser.close();
  } catch (e) {
    console.error("Script failed:", e);
    if (browser) await browser.close();
  }
})();
