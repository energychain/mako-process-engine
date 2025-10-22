const { ProcessDefinitionLoader } = require('../../src/core/loader');
const { TransformerProcessPlugin } = require('../../src/integrations/transformer-plugin');
const { ProcessAwareRouter } = require('../../src/integrations/router-plugin');

describe('Full Pipeline Integration', () => {
  let router;
  let loader;

  beforeAll(async () => {
    loader = new ProcessDefinitionLoader('./definitions');

    const processPlugin = new TransformerProcessPlugin('./definitions');
    await processPlugin.initialize();

    router = new ProcessAwareRouter('./definitions', {
      defaultQueue: 'unknown'
    });
    await router.initialize();
  });

  test('GPKE Anmeldung NN - Registry lookup', async () => {
    const registry = await loader.loadAll();
    const process = registry.findByPruefidentifikator('44001');
    expect(process).toBeDefined();
    expect(process.name).toBe('GPKE Anmeldung Netzbetrieb');
  });

  test('Process-aware routing returns metadata', async () => {
    const message = {
      metadata: {
        message_type: 'UTILMD',
        pruefidentifikator: { id: '44001' },
        reference_number: 'MSG-1'
      }
    };

    const routing = await router.route(message);

    expect(routing.queue).toBe('gpke.outbound.44001');
    expect(routing.priority).toBe('normal');
    expect(routing.metadata.process_id).toBe('gpke-anmeldung-nn');
  });
});
