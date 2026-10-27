const fs = require('fs');

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (!summaryPath) process.exit(0);

const coverageFile = 'coverage/coverage-summary.json';
if (!fs.existsSync(coverageFile)) process.exit(0);

const total = JSON.parse(fs.readFileSync(coverageFile, 'utf8')).total;
const keys = ['statements', 'branches', 'functions', 'lines'];
const rows = keys.map((key) => `| ${key} | ${total[key].pct}% | ${total[key].covered}/${total[key].total} |`);
const body = [
  '## Coverage',
  '',
  '| Metric | Percent | Covered |',
  '| --- | --- | --- |',
  ...rows,
  '',
].join('\n');
fs.appendFileSync(summaryPath, body);
