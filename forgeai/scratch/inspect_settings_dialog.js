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
    await page.goto('https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com/lightning/setup/ManageExternalClientApplication/home', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 12000));

    // Let's click "Show actions" for "Forge AI Login"
    await page.evaluate(() => {
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
        if (row.innerText && row.innerText.includes('Forge AI Login')) {
          targetRow = row;
          break;
        }
      }
      if (targetRow) {
        const buttons = findElementsDeep(targetRow, 'button');
        const actionButton = buttons.find(b => b.innerText.includes('actions') || b.className.includes('row-action') || b.getAttribute('aria-label')?.includes('actions')) || buttons[buttons.length - 1];
        if (actionButton) {
          actionButton.scrollIntoView();
          actionButton.click();
        }
      }
    });

    await new Promise(r => setTimeout(r, 3000));

    // Click "Edit Settings"
    await page.evaluate(() => {
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
      const items = findElementsDeep(document, '.slds-dropdown__item, a, button, [role="menuitem"]');
      for (const item of items) {
        if (item.innerText.trim().toLowerCase() === 'edit settings') {
          item.click();
          break;
        }
      }
    });

    console.log("Clicked Edit Settings, waiting 15 seconds...");
    await new Promise(r => setTimeout(r, 15000));

    // Let's capture the DOM tree or search for dialog/modal elements
    const domInspection = await page.evaluate(() => {
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

      // Find any dialog, modal, form, or section
      const dialogs = findElementsDeep(document, 'section, [role="dialog"], .slds-modal, form, [class*="modal"]');
      const dialogsInfo = dialogs.map((d, i) => ({
        index: i,
        tagName: d.tagName,
        className: d.className,
        role: d.getAttribute('role'),
        innerText: d.innerText ? d.innerText.substring(0, 1000) : '',
        inputs: Array.from(d.querySelectorAll('input, textarea')).map(input => ({
          tagName: input.tagName,
          id: input.id,
          value: input.value,
          labelText: (() => {
            if (input.id) {
              const label = document.querySelector(`label[for="${input.id}"]`);
              if (label) return label.innerText.trim();
            }
            return '';
          })()
        }))
      }));

      // Let's also search for ANY text containing '3MVG' or 'Consumer Key' or 'Consumer Secret' in the entire DOM
      const allElements = findElementsDeep(document, '*');
      const matches = allElements.filter(el => {
        const text = el.innerText || '';
        const value = el.value || '';
        return (text.includes('Consumer Key') || text.includes('Consumer Secret') || text.includes('3MVG') || value.includes('3MVG'));
      }).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        text: el.innerText ? el.innerText.substring(0, 200) : '',
        value: el.value || ''
      }));

      return {
        dialogsCount: dialogs.length,
        dialogsInfo,
        matches: matches.slice(0, 50)
      };
    });

    console.log("Dialogs found:", domInspection.dialogsCount);
    domInspection.dialogsInfo.forEach(d => {
      console.log(`\nDialog ${d.index}: Tag=${d.tagName}, Class=${d.className}, Role=${d.role}`);
      console.log(`Text preview: ${d.innerText.replace(/\n/g, ' | ').substring(0, 500)}`);
      console.log(`Inputs found:`, d.inputs);
    });

    console.log("\nMatching elements in whole document:");
    domInspection.matches.forEach((m, idx) => {
      console.log(`Match ${idx}: Tag=${m.tagName}, ID=${m.id}, Class=${m.className}, Text="${m.text.substring(0, 100)}", Value="${m.value}"`);
    });

    await page.screenshot({ path: path.join(__dirname, 'inspect_modal_after_click.png') });
    console.log("Saved inspect_modal_after_click.png");

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
  }
})();
