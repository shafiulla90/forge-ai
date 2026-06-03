require('dotenv').config({path:'.env.local'});
const { executeDeployment } = require('../lib/deploy');

(async () => {
  const depId = '5970709a-89e8-4d59-b695-e5b58fb7183c';
  console.log('Manually executing deployment:', depId);
  try {
    await executeDeployment(depId);
    console.log('Execution finished without unhandled exception.');
  } catch (err) {
    console.error('Unhandled exception during execution:', err);
  }
})();
