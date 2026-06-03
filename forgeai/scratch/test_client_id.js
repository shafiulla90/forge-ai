const fetch = require('node:browser' in globalThis ? 'undefined' : 'node-fetch').default || require('node-fetch');

async function testUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status}`);
    console.log(`Location Header: ${res.headers.get('location')}`);
    const text = await res.text();
    console.log(`Body: ${text}`);
    if (text.includes('invalid_client_id') || text.includes('invalid_client')) {
      console.log(`-> INVALID CLIENT ID`);
    } else {
      console.log(`-> MIGHT BE VALID (or other response)`);
    }
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error(`Error fetching ${url}:`, err.message);
  }
}

async function run() {
  const redirectUri = 'http://localhost:3000/api/auth/salesforce/callback';
  
  const clientIds = {
    'env_clientId': '3MVG9GBhY6wQjl2vb2wlsf7CinetU4JTOimKReTDoObGcUK91vP_ExTbCaCUpEDzZzP7ASewwVrd8ZP89nyE',
    'test_js_clientId': '3MVG9GBhY6wQjl2vb2wlsf7CinZMkspQNpMDmS1bryBwLnjdlKO89ukBVpSHfr24dPQL8SxJNqkZHNT1Fy6Q'
  };
  
  const domains = [
    'https://login.salesforce.com',
    'https://forgeaidevorg-dev-ed.develop.my.salesforce.com'
  ];
  
  for (const [name, clientId] of Object.entries(clientIds)) {
    for (const domain of domains) {
      const url = `${domain}/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=api%20refresh_token%20full`;
      await testUrl(url);
    }
  }
}

run();
