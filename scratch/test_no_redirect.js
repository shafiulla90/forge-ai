const fetch = require('node:browser' in globalThis ? 'undefined' : 'node-fetch').default || require('node-fetch');

async function testUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Body: ${text}`);
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  const clientIds = [
    '3MVG9GBhY6wQjl2vb2wlsf7CinetU4JTOimKReTDoObGcUK91vP_ExTbCaCUpEDzZzP7ASewwVrd8ZP89nyE', // env
    '3MVG9GBhY6wQjl2vb2wlsf7CinZMkspQNpMDmS1bryBwLnjdlKO89ukBVpSHfr24dPQL8SxJNqkZHNT1Fy6Q'  // test.js
  ];
  
  const domains = [
    'https://login.salesforce.com',
    'https://forgeaidevorg-dev-ed.develop.my.salesforce.com'
  ];
  
  for (const clientId of clientIds) {
    for (const domain of domains) {
      await testUrl(`${domain}/services/oauth2/authorize?response_type=code&client_id=${clientId}`);
    }
  }
}

run();
