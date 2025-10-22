# mako-process-definitions

> Maschinenlesbare Prozessdefinitionen für GPKE, WiM und GeLi Gas – gebaut für gestresste Entwickler:innen bei Energieversorgern.

[Deutsch](README.md) · [English](README.en.md)

## ⭐️ Highlights

- **Konzentriertes Expertenwissen**: Wir extrahieren die BDEW/AHB-Regeln in strukturierte YAML-Dateien.
- **Sofort nutzbar**: Loader, Validierung und Integrations-Plugins liefern Mehrwert ohne Regelwerks-Studium.
- **Aktuell bleiben**: Der Willi-Mako-Sync synchronisiert Definitionen mit der MCP-Wissensbasis.

Maintainer: **STROMDAO GmbH** – <dev@stromdao.com>

---

## 📦 Installation

```bash
npm install mako-process-definitions
```

Voraussetzung: Node.js 18.18 oder höher.

---

## 🚀 Schnellstart

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

## 🧠 Kontext für Nicht-MaKo-Profis

- **GPKE** regelt die Marktkommunikation beim Lieferantenwechsel und Stammdatenänderungen (elektrische Energie).
- **WiM** kümmert sich um Messwesen-Prozesse rund um Stromzähler und Messstellenbetreiber.
- **GeLi Gas** deckt Lieferantenwechselprozesse im Gasmarkt ab.
- **Prüfidentifikatoren** (z. B. `44001`) benennen konkrete Nachrichtenszenarien.

Unsere Definitionen beschreiben pro Prozess:

- Trigger-Nachricht (`UTILMD`, `MSCONS`, ...)
- Erwartete Antworten inkl. Fristen
- Prozesszustände (z. B. `pending`, `confirmed`)
- Validierungsregeln (z. B. Marktlokations-ID muss 11-stellig sein)

---

## 📂 Repository-Überblick

| Pfad | Inhalt |
| ---- | ------ |
| `definitions/` | YAML-Dateien je Prozess (GPKE/WiM/GeLi Gas/MaBiS) |
| `src/core/` | Loader, Validator, Registry |
| `src/integrations/` | Plugins für `edifact-json-transformer`, `mako-message-router`, Willi-Mako-Sync |
| `scripts/` | CLI-Tools (`generate-from-willi`, `validate-all`, `sanitize-existing-definitions`) |
| `docs/` | Hintergrundinfos für Entwickler:innen |
| `examples/` | Einstiegsskripte zur Integration |

---

## 🛠️ Tooling & Workflows

- `npm run lint` – ESLint-Checks
- `npm test` – Jest-Tests, inkl. Integrationspfade
- `npm run definitions:validate` – Schema-Validierung der YAML-Dateien
- `npm run definitions:generate` – Sync mit Willi Mako (erfordert Token)
- `npm run definitions:sanitize` – Normalisiert bestehende YAML-Dateien mit der aktuellen Sanitizer-Logik
- GitHub Actions: Continuous Integration + wöchentliche Synchronisation

---

## ✋ Manuelle Kuratierung

Der Generator liefert hochwertige Defaults, aber einige Prüfi-Varianten benötigen weiterhin Fachwissen (z. B. `definitions/gpke/44001-44001.yaml`). Markiere solche Dateien in Reviews, dokumentiere Quellen im PR und prüfe sie im Release-Prozess erneut.

---

## 🧩 Integrationen

### EDIFACT-Transformer

```javascript
const { EdifactTransformer } = require('edifact-json-transformer');
const { TransformerProcessPlugin } = require('mako-process-definitions/integrations/transformer');

const plugin = new TransformerProcessPlugin();
await plugin.initialize();

const transformer = new EdifactTransformer({ plugins: [plugin] });
const message = transformer.transform(edifactInput);

console.log(message.process.expected_responses);
```

### Prozessbasiertes Routing

```javascript
const { ProcessAwareRouter } = require('mako-process-definitions/integrations/router');

const router = new ProcessAwareRouter();
await router.initialize();

const routing = await router.route(message);
console.log(routing.queue); // z. B. gpke.outbound.44001
```

---

## 🔐 Konfiguration

1. `.env.example` kopieren → `.env`
2. Willi-Mako-Token erzeugen: `willi-mako auth login -e <email> -p <password>`
3. `WILLI_MAKO_TOKEN` setzen

Weitere Details: [docs/configuration.md](docs/configuration.md)

---

## 📚 Weiterführende Dokumente

- [Energy Market Basics](docs/energy-market-basics.md)
- [Process Definition Guide](docs/process-definition-guide.md)
- [Integration Guide](docs/integration-guide.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Release Playbook](docs/release-playbook.md)
- [Changelog](CHANGELOG.md)

---

## 🤝 Contributing

Pull Requests und Issues sind willkommen. Bitte beachte:

- Schema-Checks (`npm run definitions:validate`) vor jedem Commit
- Naming: `<pruefidentifikator>-<slug>.yaml`
- Konventionelle Commits bevorzugt

Contributor Covenant Code of Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

## 🛠️ Support & Kontakt

- Maintainer: STROMDAO GmbH – <dev@stromdao.com>
- Issues: [GitHub Tracker](https://github.com/energychain/mako-process-definitions/issues)

---

## 📄 Lizenz

MIT © [STROMDAO GmbH](https://stromdao.de/)
