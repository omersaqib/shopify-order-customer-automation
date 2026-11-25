const path = require('node:path');
process.env.CYPRESS_CACHE_FOLDER = path.resolve(__dirname, '..', '.cache', 'Cypress');
const dry = process.argv.includes('--dry-run');
process.env.SUBMIT_ORDERS = dry ? 'false' : 'true';
if (dry) process.env.ORDER_COUNT = '1';
require('cypress').run({ browser: process.env.TEST_BROWSER || 'chrome', headed: !process.argv.includes('--headless'), configFile: 'cypress.config.cjs' })
  .then(result => { process.exitCode = result.failures || result.totalFailed ? 1 : 0; })
  .catch(error => { console.error(error); process.exitCode = 1; });
