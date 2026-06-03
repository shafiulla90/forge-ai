require('dotenv').config({path:'.env.local'});
const { executeDeployment } = require('../lib/deploy');

(async () => {
  const depId = '5970709a-89e8-4d59-b695-e5b58fb7183c';
  const qaOrgId = '8af97b72-78b0-42a0-9c1c-a0e347b4d208';
  console.log('Manually executing deployment of SCRUM-16 to QA Sandbox:', qaOrgId);
  try {
    await executeDeployment(depId, qaOrgId);
    console.log('Execution finished without unhandled exception.');
  } catch (err) {
    console.error('Unhandled exception during execution:', err);
  }
})();
