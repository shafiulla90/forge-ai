const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching automated browser session...");
  const browser = await puppeteer.launch({ 
    headless: true,
    userDataDir: path.join(__dirname, 'sf_profile'),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);

  try {
    console.log("Navigating to External Client App Manager...");
    await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/ManageExternalClientApplication/home', { waitUntil: 'networkidle2' });
    
    console.log("Waiting for page load...");
    await new Promise(r => setTimeout(r, 15000));
    
    // Find rows and click the action button for "Forge AI Login" first, or try each one of them
    const appNames = ["Forge_AI_QA", "Forge AI Multi-Org", "Forge AI Login", "Forge AI Builder"];
    
    for (const appName of appNames) {
      console.log(`\n=== Processing App: ${appName} ===`);
      
      // Let's run a script inside the page to click the action button for the specific appName
      const clicked = await page.evaluate((targetName) => {
        function findElementsDeep(root, selector, results = []) {
          if (!root) return results;
          if (root.querySelectorAll) {
            const found = root.querySelectorAll(selector);
            found.forEach(el => results.push(el));
          }
          const children = root.children ? Array.from(root.children) : [];
          children.forEach(child => findElementsDeep(child, selector, results));
          if (root.shadowRoot) {
            findElementsDeep(root.shadowRoot, selector, results);
          }
          return results;
        }

        const rows = findElementsDeep(document, 'tr, [role="row"]');
        let targetRow = null;
        for (const row of rows) {
          if (row.innerText && row.innerText.includes(targetName)) {
            targetRow = row;
            break;
          }
        }

        if (!targetRow) {
          return { success: false, reason: "Row not found" };
        }

        // Find the action button inside this row
        const buttons = findElementsDeep(targetRow, 'button, a');
        let actionButton = null;
        for (const btn of buttons) {
          const text = btn.innerText || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          if (text.includes('Show actions') || ariaLabel.includes('Show actions') || btn.className.includes('row-action') || text.includes('actions') || text.includes('Show')) {
            actionButton = btn;
            break;
          }
        }

        if (!actionButton) {
          // If no specific actions button is found, click the last button in the row
          const allButtons = findElementsDeep(targetRow, 'button');
          if (allButtons.length > 0) {
            actionButton = allButtons[allButtons.length - 1];
          }
        }

        if (actionButton) {
          actionButton.scrollIntoView();
          actionButton.click();
          return { success: true, buttonText: actionButton.innerText, buttonClass: actionButton.className };
        }

        return { success: false, reason: "Action button not found" };
      }, appName);

      console.log("Click result:", clicked);
      if (!clicked.success) {
        continue;
      }

      // Wait 3 seconds for dropdown menu to appear
      await new Promise(r => setTimeout(r, 3000));
      
      // Let's take a screenshot to see what's on screen
      const screenshotPath = path.join(__dirname, `actions_${appName.replace(/\s+/g, '_')}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to ${screenshotPath}`);

      // Let's find the dropdown menu options and print them
      const menuOptions = await page.evaluate(() => {
        function findElementsDeep(root, selector, results = []) {
          if (!root) return results;
          if (root.querySelectorAll) {
            const found = root.querySelectorAll(selector);
            found.forEach(el => results.push(el));
          }
          const children = root.children ? Array.from(root.children) : [];
          children.forEach(child => findElementsDeep(child, selector, results));
          if (root.shadowRoot) {
            findElementsDeep(root.shadowRoot, selector, results);
          }
          return results;
        }

        // Dropdown menu items are usually in slds-dropdown__item or role="menuitem"
        const items = findElementsDeep(document, '.slds-dropdown__item, [role="menuitem"], a, button');
        const visibleItems = items.map(el => {
          const text = el.innerText.trim();
          const rect = el.getBoundingClientRect();
          return { text, rect, tag: el.tagName, id: el.id, className: el.className };
        }).filter(item => item.text && item.rect.width > 0 && item.rect.height > 0);
        
        return visibleItems;
      });

      console.log("Visible menu options:");
      menuOptions.forEach((opt, idx) => {
        console.log(`  Option ${idx}: text="${opt.text}" (Tag: ${opt.tag}, Class: ${opt.className})`);
      });

      // Let's click the option that says "View" or "Details" or similar
      const clickOptionResult = await page.evaluate((targetText) => {
        function findElementsDeep(root, selector, results = []) {
          if (!root) return results;
          if (root.querySelectorAll) {
            const found = root.querySelectorAll(selector);
            found.forEach(el => results.push(el));
          }
          const children = root.children ? Array.from(root.children) : [];
          children.forEach(child => findElementsDeep(child, selector, results));
          if (root.shadowRoot) {
            findElementsDeep(root.shadowRoot, selector, results);
          }
          return results;
        }

        const items = findElementsDeep(document, 'a, button, [role="menuitem"]');
        for (const item of items) {
          const text = item.innerText.trim().toLowerCase();
          if (text === 'view' || text === 'details' || text === 'view details' || text.includes('view') || text.includes('detail')) {
            const rect = item.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              item.click();
              return { success: true, text: item.innerText.trim() };
            }
          }
        }
        return { success: false, reason: "View/details option not found or visible" };
      });

      console.log("Click option result:", clickOptionResult);

      if (clickOptionResult.success) {
        // Wait for detail modal or detail page to load
        await new Promise(r => setTimeout(r, 6000));
        
        const detailScreenshotPath = path.join(__dirname, `detail_${appName.replace(/\s+/g, '_')}.png`);
        await page.screenshot({ path: detailScreenshotPath });
        console.log(`Saved detail page screenshot to ${detailScreenshotPath}`);

        // Let's pierce shadow DOM and extract Consumer Key and Client ID and secret from the page
        const extracted = await page.evaluate(() => {
          function findElementsDeep(root, selector, results = []) {
            if (!root) return results;
            if (root.querySelectorAll) {
              const found = root.querySelectorAll(selector);
              found.forEach(el => results.push(el));
            }
            const children = root.children ? Array.from(root.children) : [];
            children.forEach(child => findElementsDeep(child, selector, results));
            if (root.shadowRoot) {
              findElementsDeep(root.shadowRoot, selector, results);
            }
            return results;
          }

          // Let's get all texts from divs, spans, inputs, labels
          const divs = findElementsDeep(document, 'div, span, label, input');
          const texts = divs.map(d => {
            if (d.tagName === 'INPUT') {
              return `INPUT:${d.value || d.placeholder || ''}`;
            }
            return d.innerText ? d.innerText.trim() : '';
          }).filter(Boolean);

          return { texts: texts.slice(0, 200) };
        });

        console.log("Extracted texts snippet:");
        console.log(JSON.stringify(extracted.texts.slice(0, 100)));
        
        // Wait, how do we go back or close the modal? 
        // We can just reload the page for the next app
        await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/ManageExternalClientApplication/home', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 8000));
      }
    }

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
  }
})();
