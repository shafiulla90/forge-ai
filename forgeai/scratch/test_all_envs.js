const fetch = require('node:browser' in globalThis ? 'undefined' : 'node-fetch').default || require('node-fetch');

async function testUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Body: ${text.substring(0, 200)}`);
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  const configs = [
    {
      name: 'QA',
      clientId: '3MVG9CP2Kv.52YFu9POEqL9EK0Sb_fOVOIrOSo3xYO12uCNunOfZCpaPWUHhBaCknzHVzlG1icu5lHhISUGgC',
      domain: 'https://covenantsynergyprivatelimited2--shafi.sandbox.my.salesforce.com'
    },
    {
      name: 'UAT',
      clientId: '3MVG9LQU2EgIG3GDxSWjRhPknsuLC_m2ByPmQutfbLuCJULOih07fCJJ45cYsuC1LZDvyNiYNXRFeBeH9vIZu',
      domain: 'https://covenantsynergyprivatelimited2--uat.sandbox.my.salesforce.com'
    }
  ];
  
  for (const config of configs) {
    console.log(`Testing config: ${config.name}`);
    await testUrl(`${config.domain}/services/oauth2/authorize?response_type=code&client_id=${config.clientId}`);
    await testUrl(`https://test.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${config.clientId}`);
  }
}

run();
