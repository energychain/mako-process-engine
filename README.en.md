# mako-process-definitions

> Machine-readable process definitions for GPKE, WiM and GeLi Gas – built for busy engineering teams at European utilities.

[Deutsch](README.md) · [English](README.en.md)

## ⭐️ Highlights

- **Concentrated domain knowledge**: The BDEW/AHB rules are distilled into structured YAML documents.
- **Ready to use**: Loader, validation and integrations add value without forcing you to read the entire rulebooks.
- **Always up to date**: The Willi Mako sync script keeps the definitions aligned with the MCP knowledge base.

Maintainer: **STROMDAO GmbH** – <dev@stromdao.com>

---

## 📦 Installation

```bash
npm install mako-process-definitions
```

Requirement: Node.js 18.18 or newer.

---

## 🚀 Quick Start

```javascript
const { ProcessDefinitionLoader } = require('mako-process-definitions');

async function main() {
  const loader = new ProcessDefinitionLoader();
  const registry = await loader.loadAll();

  const process = registry.findByPruefidentifikator('44001');
  console.log(process.name);
}

main();
```

---

## 🧠 MaKo Primer

- **GPKE** – Processes for customer supply in the electricity market (switching, master data updates).
- **WiM** – Metering processes around electricity meters and metering point operators.
- **GeLi Gas** – Switching processes for the German gas market.
- **Prüfidentifikatoren** (e.g. `44001`) label the exact business scenario inside the EDIFACT handbooks.

Each definition covers:

- Trigger message (`UTILMD`, `MSCONS`, ...)
- Expected responses with deadlines
- Process states (e.g. `pending`, `confirmed`)
- Lightweight validation rules (e.g. market location must be 11 digits)

---

## 📂 Repository Overview

| Path | Description |
| ---- | ----------- |
| `definitions/` | YAML files per process (GPKE/WiM/GeLi Gas/MaBiS) |
| `src/core/` | Loader, validator, registry |
| `src/integrations/` | Plugins for `edifact-json-transformer`, `mako-message-router`, Willi Mako sync |
| `scripts/` | CLI tools (`generate-from-willi`, `validate-all`, `sanitize-existing-definitions`) |
| `docs/` | Background information for contributors |
| `examples/` | Starter scripts for integrations |

---

## 🛠️ Tooling & Workflows

- `npm run lint` – ESLint checks
- `npm test` – Jest test suite including integration coverage
- `npm run definitions:validate` – Schema validation for all YAML files
- `npm run definitions:generate` – Synchronise with Willi Mako (requires token)
- `npm run definitions:sanitize` – Normalise existing YAML files using the current sanitiser
- GitHub Actions – Continuous integration and weekly sync job

---

## ✋ Manual Curation

The generator produces high-quality defaults, but some Prüfi variants require human knowledge (for example `definitions/gpke/44001-44001.yaml`). Mark such definitions for review during releases and prefer pull requests that explain data sources.

---

## 🧩 Integrations

### EDIFACT Transformer

```javascript
const { EdifactTransformer } = require('edifact-json-transformer');
const { TransformerProcessPlugin } = require('mako-process-definitions/integrations/transformer');

const plugin = new TransformerProcessPlugin();
await plugin.initialize();

const transformer = new EdifactTransformer({ plugins: [plugin] });
const message = transformer.transform(edifactInput);

console.log(message.process.expected_responses);
```

### Process-aware Routing

```javascript
const { ProcessAwareRouter } = require('mako-process-definitions/integrations/router');

const router = new ProcessAwareRouter();
await router.initialize();

const routing = await router.route(message);
console.log(routing.queue); // e.g. gpke.outbound.44001
```

---

## 🔐 Configuration

1. Copy `.env.example` to `.env`.
2. Generate a Willi Mako token: `willi-mako auth login -e <email> -p <password>`.
3. Set `WILLI_MAKO_TOKEN` in your environment.

More details: [docs/configuration.md](docs/configuration.md)

---

## 📚 Further Reading

- [Energy Market Basics](docs/energy-market-basics.md)
- [Process Definition Guide](docs/process-definition-guide.md)
- [Integration Guide](docs/integration-guide.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Release Playbook](docs/release-playbook.md)
- [Changelog](CHANGELOG.md)

---

## 🤝 Contributing

Pull requests and issues are welcome. Please:

- Run schema checks (`npm run definitions:validate`) before pushing
- Follow the naming scheme `<pruefidentifikator>-<slug>.yaml`
- Prefer Conventional Commits

Contributor Covenant: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

## 🛠️ Support & Contact

- Maintainer: STROMDAO GmbH – <dev@stromdao.com>
- Issues: [GitHub Tracker](https://github.com/energychain/mako-process-definitions/issues)

---

## 📄 License

MIT © [STROMDAO GmbH](https://stromdao.de/)
