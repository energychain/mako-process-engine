const { ProcessAwareRouter } = require('../src/integrations/router-plugin');

async function run() {
  const router = new ProcessAwareRouter();
  await router.initialize();

  const routing = await router.route({
    metadata: {
      message_type: 'UTILMD',
      pruefidentifikator: { id: '44001' },
      reference_number: 'MSG-2025-0001'
    }
  });

  console.log(routing);
}

run().catch(console.error);
