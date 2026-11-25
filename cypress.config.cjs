const { defineConfig } = require('cypress');
const fs = require('node:fs');
const path = require('node:path');
const runId = process.env.RUN_ID || 'omar-20261125';
if (!/^[a-z0-9-]+$/.test(runId)) throw new Error('RUN_ID must contain lowercase letters, numbers or hyphens');
const reportDir = path.join(__dirname, 'reports', runId);
fs.mkdirSync(reportDir, { recursive: true });
const journalFile = path.join(reportDir, 'orders.json');
function read() { return fs.existsSync(journalFile) ? JSON.parse(fs.readFileSync(journalFile, 'utf8')) : {}; }
function write(data) { fs.writeFileSync(journalFile + '.tmp', JSON.stringify(data, null, 2)); fs.renameSync(journalFile + '.tmp', journalFile); }
module.exports = defineConfig({
  video: process.env.RECORD_VIDEO === 'true',
  videosFolder: path.join(reportDir, 'videos'),
  modifyObstructiveCode: false,
  trashAssetsBeforeRuns: false,
  viewportWidth: 1440, viewportHeight: 1100,
  defaultCommandTimeout: 20000, pageLoadTimeout: 90000,
  retries: 0,
  screenshotsFolder: path.join(reportDir, 'screenshots'),
  expose: { runId, count: Number(process.env.ORDER_COUNT || 101), start: Number(process.env.START_INDEX || 1), submit: process.env.SUBMIT_ORDERS === 'true' },
  e2e: {
    baseUrl: 'https://preloved-by-omar.myshopify.com',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on) {
      on('task', {
        orderState(index) { return read()[index] || null; },
        recordOrder(record) {
          const data = read();
          const now = new Date().toISOString();
          data[record.index] = { ...data[record.index], ...record, updatedAt: now };
          if (record.status === 'submitting') data[record.index].submittedAt = now;
          write(data); return null;
        },
        async beforeSubmit() {
          const latest = Math.max(0, ...Object.values(read()).map(order => Date.parse(order.submittedAt || order.updatedAt) || 0));
          const delay = Math.max(0, latest + 15000 - Date.now());
          if (delay) await new Promise(resolve => setTimeout(resolve, delay));
          return null;
        },
        log(message) { console.log(message); return null; }
      });
    }
  }
});
