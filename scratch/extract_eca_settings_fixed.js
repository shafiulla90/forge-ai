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
    const appNames = ["Forge AI Login", "Forge AI Multi-Org", "Forge_AI_QA", "Forge AI Builder"];
    
    for (const appName of appNames) {
      console.log(`\n========================================`);
      console.log(`Processing App Settings: ${appName}`);
      console.log(`========================================`);
      
      await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/ManageExternalClientApplication/home', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 12000));

      // Click the action button for the specific appName
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

        if (!targetRow) return { success: false, reason: "Row not found" };

        const buttons = findElementsDeep(targetRow, 'button');
        let actionButton = null;
        for (const btn of buttons) {
          const text = btn.innerText || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          if (text.includes('Show actions') || ariaLabel.includes('Show actions') || btn.className.includes('row-action') || text.includes('actions')) {
            actionButton = btn;
            break;
          }
        }

        if (!actionButton && buttons.length > 0) {
          actionButton = buttons[buttons.length - 1];
        }

        if (actionButton) {
          actionButton.scrollIntoView();
          actionButton.click();
          return { success: true };
        }
        return { success: false, reason: "Button not found" };
      }, appName);

      console.log("Click Show actions:", clicked);
      if (!clicked.success) continue;

      // Wait 3 seconds for dropdown menu
      await new Promise(r => setTimeout(r, 3000));

      // Click "Edit Settings" dropdown option specifically
      const clickedEditSettings = await page.evaluate(() => {
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

        // Dropdown menu items are usually in .slds-dropdown__item or role="menuitem"
        const items = findElementsDeep(document, '.slds-dropdown__item, [role="menuitem"], a, button');
        for (const item of items) {
          const text = item.innerText.trim().toLowerCase();
          // We must match EXACTLY "edit settings" to avoid clicking global settings links!
          if (text === 'edit settings') {
            const rect = item.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              item.click();
              return { success: true, text: item.innerText.trim() };
            }
          }
        }
        return { success: false, reason: "Edit Settings dropdown option not found/visible" };
      });

      console.log("Click Edit Settings:", clickedEditSettings);
      if (!clickedEditSettings.success) continue;

      // Wait for Settings page/dialog to load
      console.log("Waiting 12 seconds for settings page/dialog to load...");
      await new Promise(r => setTimeout(r, 12000));

      const screenshotName = `settings_${appName.replace(/\s+/g, '_')}_fixed.png`;
      await page.screenshot({ path: path.join(__dirname, screenshotName) });
      console.log(`Saved screenshot: ${screenshotName}`);

      // Let's print the page text or check if there is an iframe loaded
      const pageInfo = await page.evaluate(() => {
        const url = window.location.href;
        const bodyText = document.body ? document.body.innerText.substring(0, 1000) : '';
        const frames = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        return { url, bodyText, frames };
      });
      console.log("Current Page URL:", pageInfo.url);
      console.log("Body Snippet:", pageInfo.bodyText.replace(/\n/g, ' | '));
      console.log("Frames detected inside page:", pageInfo.frames);

      // Inspect settings elements (Consumer Key / Consumer Secret / Client ID / callback)
      const settingsDetails = await page.evaluate(() => {
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

        const inputs = findElementsDeep(document, 'input, textarea');
        const inputData = inputs.map(input => ({
          id: input.id,
          name: input.name,
          value: input.value,
          placeholder: input.placeholder,
          type: input.type,
          labelText: (() => {
            if (input.id) {
              const label = document.querySelector(`label[for="${input.id}"]`);
              if (label) return label.innerText.trim();
            }
            let parent = input.parentElement;
            while (parent) {
              const label = parent.querySelector('label');
              if (label) return label.innerText.trim();
              parent = parent.parentElement;
            }
            return '';
          })()
        }));

        const spans = findElementsDeep(document, 'span, div, p');
        const textSnippets = spans.map(s => s.innerText ? s.innerText.trim() : '').filter(t => {
          return t && (t.toLowerCase().includes('consumer') || t.toLowerCase().includes('client') || t.toLowerCase().includes('key') || t.toLowerCase().includes('secret') || t.toLowerCase().includes('3mvg') || t.toLowerCase().includes('callback'));
        });

        return {
          inputData,
          textSnippets: textSnippets.slice(0, 50)
        };
      });

      console.log("Settings fields found:");
      settingsDetails.inputData.forEach((field, i) => {
        console.log(`  Field ${i}: label="${field.labelText}" value="${field.value}" (Type: ${field.type}, ID: ${field.id})`);
      });

      console.log("Text snippets matching key/secret:");
      settingsDetails.textSnippets.forEach((snippet, i) => {
        console.log(`  Snippet ${i}: "${snippet.replace(/\n/g, ' | ')}"`);
      });

      // Let's see if we can find a button to reveal the secret or key
      const revealBtnClicked = await page.evaluate(() => {
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

        const buttons = findElementsDeep(document, 'button');
        let clickedReveal = false;
        for (const btn of buttons) {
          const text = btn.innerText.trim().toLowerCase();
          if (text.includes('reveal') || text.includes('show') || text.includes('key') || text.includes('secret')) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              btn.click();
              clickedReveal = true;
            }
          }
        }
        return clickedReveal;
      });
      
      if (revealBtnClicked) {
        console.log("Clicked reveal/show button! Waiting 3 seconds...");
        await new Promise(r => setTimeout(r, 3000));
        
        const revealedScreenshotName = `settings_${appName.replace(/\s+/g, '_')}_fixed_revealed.png`;
        await page.screenshot({ path: path.join(__dirname, revealedScreenshotName) });
        console.log(`Saved screenshot after reveal: ${revealedScreenshotName}`);

        const revealedDetails = await page.evaluate(() => {
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

          const inputs = findElementsDeep(document, 'input, textarea');
          return inputs.map(input => ({
            id: input.id,
            value: input.value,
            labelText: (() => {
              if (input.id) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) return label.innerText.trim();
              }
              return '';
            })()
          }));
        });
        
        console.log("Revealed fields:");
        revealedDetails.forEach((field, i) => {
          console.log(`  Revealed Field ${i}: label="${field.labelText}" value="${field.value}"`);
        });
      }
    }

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
  }
})();
