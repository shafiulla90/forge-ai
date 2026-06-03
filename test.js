const clientId = '3MVG9GBhY6wQjl2vb2wlsf7CinZMkspQNpMDmS1bryBwLnjdlKO89ukBVpSHfr24dPQL8SxJNqkZHNT1Fy6Q';
const redirectUri = 'http://localhost:3000/api/auth/salesforce/callback';

const url = `https://forgeaidevorg-dev-ed.develop.my.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;

console.log(url);