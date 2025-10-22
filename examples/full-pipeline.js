const { TransformerProcessPlugin } = require('../src/integrations/transformer-plugin');
const { ProcessAwareRouter } = require('../src/integrations/router-plugin');

async function run(edifactTransformer) {
  if (!edifactTransformer) {
    throw new Error('Provide an instance of edifact-json-transformer as argument.');
  }

  const plugin = new TransformerProcessPlugin();
  await plugin.initialize();

  edifactTransformer.registerPlugin(plugin);

  const router = new ProcessAwareRouter();
  await router.initialize();

  const message = edifactTransformer.transform(`UNH+1+UTILMD:D:11A:UN:2.6'RFF+Z13:44001'UNT+8+1'`);
  const routing = await router.route(message);

  console.log('Routing decision', routing);
}

module.exports = { run };
