require('dotenv').config({ path: '.env.local' });
console.log("JIRA_CLIENT_ID length:", process.env.JIRA_CLIENT_ID ? process.env.JIRA_CLIENT_ID.length : 0);
console.log("JIRA_CLIENT_ID is:", process.env.JIRA_CLIENT_ID);
console.log("JIRA_CLIENT_SECRET length:", process.env.JIRA_CLIENT_SECRET ? process.env.JIRA_CLIENT_SECRET.length : 0);
console.log("NEXT_PUBLIC_APP_URL is:", process.env.NEXT_PUBLIC_APP_URL);
