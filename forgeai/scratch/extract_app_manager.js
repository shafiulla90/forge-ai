const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    const cookiesPath = path.join(__dirname, 'sf_cookies.json');
    if (!fs.existsSync(cookiesPath)) {
      console.error("sf_cookies.json not found!");
      return;
    }
    
    console.log("Loading cookies...");
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);

    console.log("Navigating to Lightning App Manager Setup...");
    const appManagerUrl = 'https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/AppManager/home';
    await page.goto(appManagerUrl, { waitUntil: 'networkidle2' }).catch(() => console.log("Navigating to App Manager timed out, continuing..."));
    
    console.log("Waiting 15 seconds for App Manager table to load...");
    await new Promise(r => setTimeout(r, 15000));
    await page.screenshot({ path: path.join(__dirname, 'lightning_app_manager.png') });
    console.log("Saved lightning_app_manager.png");
    
    // Extract rows from Lightning App Manager table
    const lightningApps = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      return rows.map(r => r.innerText).filter(t => t && t.toLowerCase().includes('forge'));
    });
    console.log("Lightning App Manager rows matching 'forge':", lightningApps);

    console.log("Navigating to Classic Connected Apps list (05D) on Setup domain...");
    const classicUrl = 'https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/05D';
    await page.goto(classicUrl, { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 5000));
    console.log("Current URL:", page.url());
    await page.screenshot({ path: path.join(__dirname, 'classic_05d_setup.png') });
    console.log("Saved classic_05d_setup.png");
    
    // Let's extract links from this page to see if we can find any Connected App links
    const classicLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.map(a => ({ text: a.innerText, href: a.href }));
    });
    console.log("Total classic links found:", classicLinks.length);
    console.log("Classic links matching '05D' or 'Connected':", classicLinks.filter(l => l.href && (l.href.includes('/05D') || l.href.toLowerCase().includes('connected'))));

    const classicBodyText = await page.evaluate(() => document.body.innerText);
    console.log("Classic page text contains 'Forge':", classicBodyText.toLowerCase().includes('forge'));
    if (classicBodyText.toLowerCase().includes('forge')) {
      console.log("Snippet of classic page text around 'Forge':");
      const idx = classicBodyText.toLowerCase().indexOf('forge');
      console.log(classicBodyText.substring(Math.max(0, idx - 100), Math.min(classicBodyText.length, idx + 200)));
    }

  } catch (err) {
    console.error("Extract failed:", err);
  } finally {
    await browser.close();
  }
})();
