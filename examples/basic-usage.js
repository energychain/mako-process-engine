const { ProcessDefinitionLoader } = require('../src');

async function run() {
  const loader = new ProcessDefinitionLoader();
  const registry = await loader.loadAll();
  const process = registry.findByPruefidentifikator('44001');

  console.log('Name:', process.name);
  console.log('Max wait time (days):', process.getMaxWaitTime());
}

run().catch(console.error);
