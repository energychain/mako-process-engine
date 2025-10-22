#!/usr/bin/env node

const path = require('path');
const { createWilliMakoProcessSync } = require('../src/integrations/willi-mako-sync');
const { describeConfigError, envPath } = require('../src/config/env');

async function main() {
  const outputDir = path.join(__dirname, '../definitions');
  const sync = createWilliMakoProcessSync();

  console.log('Starting process definition generation from Willi Mako...');
  await sync.generateAllProcesses(outputDir);
  console.log('Process definition generation completed.');
}

main().catch(error => {
  console.error(describeConfigError(error));
  console.error(`Environment file used: ${envPath}`);
  process.exitCode = 1;
});
