const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching browser using saved session cookies...");
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    const cookiesPath = path.join(__dirname, 'scratch', 'sf_cookies.json');
    if (!fs.existsSync(cookiesPath)) {
      console.error("Cookies file not found at:", cookiesPath);
      return;
    }
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);

    console.log("Navigating to Setup Connected Apps (05D on setup domain)...");
    // Navigate using the setup domain to keep cookies active!
    await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/05D', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 8000));
    
    await page.screenshot({ path: path.join(__dirname, 'scratch', 'classic_05d_setup.png') });
    console.log("Saved classic_05d_setup.png");

    // Let's print the page text or check if there is a 'Forge' app
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("Page includes 'Forge':", bodyText.toLowerCase().includes('forge'));
    
    // Let's extract the list of links that point to the Connected App details
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.map(a => ({ text: a.innerText, href: a.href }));
    });
    
    // Filter links that go to /05D (usually /05D... and have 12 to 15 chars ID)
    const appLinks = links.filter(l => l.href && /\/05D[a-zA-Z0-9]{12,15}/.test(l.href));
    console.log("Found app links:", appLinks);

    if (appLinks.length === 0) {
      console.log("No Connected App links found. Let's dump links starting with /05D:");
      console.log(links.filter(l => l.href && l.href.includes('05D')));
      return;
    }

    // Go to the first app link
    const targetLink = appLinks.find(l => l.text.toLowerCase().includes('forge')) || appLinks[0];
    console.log(`Navigating to Connected App detail page: ${targetLink.text} (${targetLink.href})...`);
    await page.goto(targetLink.href, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: path.join(__dirname, 'scratch', 'app_detail_setup.png') });
    console.log("Saved app_detail_setup.png");

    // On the Connected App detail page, extract consumer key and name
    const pageDetails = await page.evaluate(() => {
      const tds = Array.from(document.querySelectorAll('td'));
      let consumerKey = null;
      for (let i = 0; i < tds.length; i++) {
        const text = tds[i].innerText || '';
        if (text.includes('Consumer Key') && i + 1 < tds.length) {
          consumerKey = tds[i+1].innerText.trim();
        }
      }
      return { consumerKey };
    });

    console.log("Extracted Consumer Key:", pageDetails.consumerKey);

  } catch (err) {
    console.error("Error scraping connected app:", err);
  } finally {
    await browser.close();
  }
})();
