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
    await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/ManageExternalClientApplication/home', { waitUntil: 'networkidle2' });
    
    console.log("Waiting 15 seconds for External Client App Manager to load...");
    await new Promise(r => setTimeout(r, 15000));
    
    await page.screenshot({ path: path.join(__dirname, 'external_client_app_manager_new.png') });
    console.log("Saved external_client_app_manager_new.png");

    // Let's inspect frames
    const frames = page.frames();
    console.log("Total frames detected:", frames.length);
    for (let idx = 0; idx < frames.length; idx++) {
      const f = frames[idx];
      console.log(`Frame ${idx}: name=${f.name()}, url=${f.url()}`);
      try {
        const bodyText = await f.evaluate(() => document.body ? document.body.innerText.substring(0, 500) : "No body");
        console.log(`Frame ${idx} body preview: ${bodyText.replace(/\n/g, ' ')}`);
      } catch (e) {
        console.log(`Frame ${idx} evaluation error: ${e.message}`);
      }
    }

    // A function to search shadow DOM recursively in the main page context or any frame
    const inspectShadowDOM = async (frameOrPage, frameName) => {
      console.log(`\n--- Inspecting Shadow DOM inside frame: ${frameName} ---`);
      const data = await frameOrPage.evaluate(() => {
        function findElementsDeep(root, selector, results = []) {
          if (!root) return results;
          if (root.querySelectorAll) {
            const found = root.querySelectorAll(selector);
            found.forEach(el => results.push(el));
          }
          // Search children
          const children = root.children ? Array.from(root.children) : [];
          children.forEach(child => findElementsDeep(child, selector, results));
          // Search shadow root
          if (root.shadowRoot) {
            findElementsDeep(root.shadowRoot, selector, results);
          }
          return results;
        }

        const rows = findElementsDeep(document, 'tr');
        const rowsText = rows.map(r => r.innerText.trim()).filter(Boolean);
        
        // Also look at cells
        const cells = findElementsDeep(document, 'td, th');
        const cellsText = cells.map(c => c.innerText.trim()).filter(Boolean);

        // Also look at divs with role="row"
        const ariaRows = findElementsDeep(document, '[role="row"]');
        const ariaRowsText = ariaRows.map(r => r.innerText.trim()).filter(Boolean);

        // Look for links and buttons
        const links = findElementsDeep(document, 'a');
        const linksInfo = links.map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text || l.href);

        return {
          rowsCount: rows.length,
          rowsText,
          cellsCount: cells.length,
          cellsText: cellsText.slice(0, 50),
          ariaRowsCount: ariaRows.length,
          ariaRowsText: ariaRowsText.slice(0, 20),
          linksCount: links.length,
          linksInfo: linksInfo.slice(0, 30)
        };
      });

      console.log(`Rows count: ${data.rowsCount}`);
      console.log(`Aria Rows count: ${data.ariaRowsCount}`);
      console.log(`Cells count: ${data.cellsCount}`);
      console.log(`Links count: ${data.linksCount}`);
      
      console.log("Aria Rows Texts:");
      data.ariaRowsText.forEach((t, i) => console.log(`  Row ${i}: ${t.replace(/\n/g, ' | ')}`));
      
      console.log("Standard Rows Texts:");
      data.rowsText.forEach((t, i) => console.log(`  Row ${i}: ${t.replace(/\n/g, ' | ')}`));

      console.log("Links:");
      data.linksInfo.forEach((l, i) => console.log(`  Link ${i}: text="${l.text}", href="${l.href}"`));
    };

    // Run shadow DOM inspection on all frames
    for (let idx = 0; idx < frames.length; idx++) {
      try {
        await inspectShadowDOM(frames[idx], frames[idx].name() || `Frame-${idx}`);
      } catch (e) {
        console.log(`Error inspecting shadow DOM in Frame ${idx}: ${e.message}`);
      }
    }

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
  }
})();
