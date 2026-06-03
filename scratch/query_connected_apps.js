const fs = require('fs');
const path = require('path');
const jsforce = require('jsforce');

async function run() {
  try {
    const cookiesPath = path.join(__dirname, 'sf_cookies.json');
    if (!fs.existsSync(cookiesPath)) {
      console.error("sf_cookies.json not found!");
      return;
    }
    
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    const sidCookie = cookies.find(c => c.name === 'sid');
    if (!sidCookie) {
      console.error("sid cookie not found in sf_cookies.json!");
      return;
    }
    
    const sid = sidCookie.value;
    // We can clean the domain to get the instanceUrl
    // E.g., forgeaidevorg-dev-ed.develop.my.salesforce-setup.com -> forgeaidevorg-dev-ed.develop.my.salesforce.com
    const instanceUrl = 'https://forgeaidevorg-dev-ed.develop.my.salesforce-setup.com';
    
    console.log("Initializing JSforce connection with session ID...");
    const conn = new jsforce.Connection({
      instanceUrl,
      accessToken: sid
    });
    
    console.log("Querying ConnectedApps via Tooling API...");
    // Let's query DeveloperName, etc. from ConnectedApplication Tooling API object
    const result = await conn.tooling.query("SELECT Id, DeveloperName FROM ConnectedApplication");
    console.log("Connected Applications found:", JSON.stringify(result.records, null, 2));
    
    // Let's also read details for each Connected App to find Consumer Key and Secret
    for (const app of result.records) {
      console.log(`\nReading Metadata for ConnectedApp: ${app.DeveloperName}`);
      const metadata = await conn.metadata.read('ConnectedApp', app.DeveloperName);
      console.log("Metadata OAuth Config:", JSON.stringify(metadata.oauthConfig, null, 2));
    }
    
  } catch (err) {
    console.error("Error querying connected apps:", err);
  }
}

run();
