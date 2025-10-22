#!/usr/bin/env node

const path = require('path');
const { ProcessDefinitionLoader } = require('../src/core/loader');

async function main() {
  const definitionsPath = path.join(__dirname, '../definitions');
  const loader = new ProcessDefinitionLoader(definitionsPath, { enableCache: false });

  const registry = await loader.loadAll();
  console.log(`Validated ${registry.size()} process definitions.`);
}

main().catch(error => {
  console.error('Validation failed:', error.message);
  if (error.errors) {
    for (const issue of error.errors) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
  }
  process.exitCode = 1;
});
