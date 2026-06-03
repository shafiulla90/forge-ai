const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching automated browser session with profile persistence...");
  const browser = await puppeteer.launch({ 
    headless: true,
    userDataDir: path.join(__dirname, 'sf_profile'),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);

  try {
    console.log("Checking login state...");
    await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/SetupOneHome/home', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));
    
    let currentUrl = page.url();
    if (currentUrl.includes('login.salesforce.com') || currentUrl.includes('/login') || currentUrl.includes('?ec=302')) {
      console.error("Session expired! Please run the full login script first.");
      return;
    }
    console.log("Session is valid! Navigating to External Client App Manager...");
    await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/ManageExternalClientApplication/home', { waitUntil: 'networkidle2' });
    
    console.log("Waiting 15 seconds for External Client App Manager to load...");
    await new Promise(r => setTimeout(r, 15000));
    
    await page.screenshot({ path: path.join(__dirname, 'external_client_app_manager.png') });
    console.log("Saved external_client_app_manager.png");

    // Extract all rows and cells
    const allApps = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      return rows.map((r, idx) => {
        const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.innerText.trim());
        const links = Array.from(r.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
        return {
          index: idx,
          cells: cells,
          links: links
        };
      }).filter(r => r.cells.length > 0);
    });

    console.log("All extracted rows:");
    allApps.forEach(app => {
      console.log(`Row ${app.index}: ${JSON.stringify(app.cells)} (Links: ${JSON.stringify(app.links)})`);
    });

    if (allApps.length === 0) {
      console.log("No table rows found. Printing body text preview:");
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(bodyText.substring(0, 1500));
    }

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
  }
})();
