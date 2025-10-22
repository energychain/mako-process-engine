# Integration Guide

This guide shows how to embed the package into existing MaKo tooling. We assume readers have experience with Node.js or TypeScript but limited knowledge of German energy regulation.

## Installing

```bash
npm install mako-process-definitions edifact-json-transformer mako-message-router
```

For synchronisation with the Willi Mako knowledge base, also install:

```bash
npm install @energychain/willi-mako-client --save-peer
```

## Loading Process Definitions

```javascript
const { ProcessDefinitionLoader } = require('mako-process-definitions');

const loader = new ProcessDefinitionLoader();
const registry = await loader.loadAll();

const process = registry.findByPruefidentifikator('44001');
console.log(process.name); // GPKE Anmeldung Netzbetrieb
```

## Enriching EDIFACT JSON

```javascript
const { EdifactTransformer } = require('edifact-json-transformer');
const { TransformerProcessPlugin } = require('mako-process-definitions/integrations/transformer');

const plugin = new TransformerProcessPlugin();
await plugin.initialize();

const transformer = new EdifactTransformer({ plugins: [plugin] });
const message = transformer.transform(edifactString);

if (!message.process.validations.is_valid) {
  console.error(message.process.validations.errors);
}
```

## Intelligent Routing

```javascript
const { ProcessAwareRouter } = require('mako-process-definitions/integrations/router');

const router = new ProcessAwareRouter();
await router.initialize();

const routingDecision = await router.route(message);
console.log(routingDecision.queue); // gpke.outbound.44001
```

## Synchronising with Willi Mako

1. Create API credentials in the Willi Mako portal.
2. Expose `WILLI_MAKO_TOKEN` as a secret in your CI/CD system.
3. Run `npm run definitions:generate` to fetch or update YAML files.

The provided GitHub workflow (`.github/workflows/generate-definitions.yml`) demonstrates an automated weekly refresh.

> ℹ️ Environment variables are loaded from `.env`. Copy `.env.example`, set `WILLI_MAKO_TOKEN` (obtain via `willi-mako auth login -e <email> -p <password>`), and verify the token scope in the Willi Mako portal before running the sync command.
