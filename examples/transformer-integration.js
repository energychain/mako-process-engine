const { TransformerProcessPlugin } = require('../src/integrations/transformer-plugin');

async function run(transformer) {
  const plugin = new TransformerProcessPlugin();
  await plugin.initialize();

  const edifactMessage = {
    metadata: {
      message_type: 'UTILMD',
      pruefidentifikator: { id: '44001' }
    },
    body: {
      stammdaten: {
        marktlokationen: [{ id: '12345678901' }]
      }
    },
    parties: {
      lieferant: { id: '9900123456789' },
      netzbetreiber: { id: '9900987654321' }
    },
    dates: {
      start_date: '2025-01-15'
    }
  };

  const enriched = await plugin.enrich(edifactMessage, []);
  console.log('Process context:', enriched.process);
}

run().catch(console.error);
