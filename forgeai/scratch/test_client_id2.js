const fetch = require('node:browser' in globalThis ? 'undefined' : 'node-fetch').default || require('node-fetch');

async function testUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log('URL: ' + url);
    console.log('Status: ' + res.status);
    const text = await res.text();
    if (text.includes('invalid_client_id')) {
        console.log('-> INVALID CLIENT ID');
    } else {
        console.log('-> VALID! (or different error)');
        console.log(text.substring(0, 200));
    }
  } catch (err) {
    console.log(err.message);
  }
  console.log('--------------------------------------------------');
}

const uat_client = '3MVG9LQU2EgIG3GDxSWjRhPknsuLC_m2ByPmQutfbLuCJULOih07fCJJ45cYsuC1LZDvyNiYNXRFeBeH9vIZu';
const qa_client = '3MVG9CP2Kv.52YFu9POEqL9EK0Sb_fOVOIrOSo3xYO12uCNunOfZCpaPWUHhBaCknzHVzlG1icu5lHhISUGgC';

const clients = [uat_client, qa_client];
const hosts = ['https://login.salesforce.com', 'https://test.salesforce.com', 'https://covenantsynergyprivatelimited2--uat.sandbox.my.salesforce.com', 'https://covenantsynergyprivatelimited2--shafi.sandbox.my.salesforce.com', 'https://forgeaidevorg-dev-ed.develop.my.salesforce.com'];

async function run() {
  for (const client of clients) {
    for (const host of hosts) {
      const url = `${host}/services/oauth2/authorize?response_type=code&client_id=${client}&redirect_uri=http://localhost:3000/api/auth/salesforce/callback&scope=api%20refresh_token%20full`;
      await testUrl(url);
    }
  }
}
run();
