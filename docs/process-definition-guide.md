# Process Definition Guide

This guide explains how MaKo process definitions are structured and how to extend them.

## Background: What is MaKo?

German energy suppliers must exchange market communication messages (MaKo) such as UTILMD, MSCONS, or INVOIC. Each message follows strict process rules defined by the Bundesnetzagentur and coordinated through BDEW working groups (GPKE, WiM, GeLi Gas, MaBiS). Missing deadlines or incorrect message variants cause regulatory incidents and operational delays. The definitions in this repository capture that domain knowledge in a format that software engineers can reuse without being experts in the regulation.

## File Structure

Every definition lives inside `definitions/<category>/<pruefidentifikator>-<slug>.yaml`. Categories align with regulatory handbooks:

- `gpke` – Geschäftsprozesse zur Kundenbelieferung mit Elektrizität
- `wim` – Wechselprozesse im Messwesen
- `geli-gas` – Geschäftsprozesse Lieferantenwechsel im Gas
- `mabis` – Marktprozesse für die Bilanzkreisabrechnung (folder created when needed)

## YAML Sections

- `process` – Identifiers, short description, BDEW references, and Willi Mako context metadata.
- `trigger` – Which EDIFACT or XML message initiates the process. Includes senders, receivers, and Prüfidentifikator.
- `responses` – Possible follow-up messages with target states and timing information.
- `states` – Logical states used by routing and monitoring systems. Final states should set `is_final: true`.
- `validations` – Lightweight rules that downstream systems can enforce before sending a message.
- Optional sections (`timeline`, `related_processes`, `documentation`) provide extra context for operations teams.

### Willi Mako Kontextblöcke

Jede YAML-Datei enthält `process.willi_mako_context`. Verwende dieses Feld, um die Wissensquellen aus dem Willi Mako MCP Service zu dokumentieren:

- `knowledge_base_ids` – IDs der Retrieval-Ergebnisse (z. B. `gpke-wechsel-2024`). Das erleichtert späteres Nachvollziehen, warum bestimmte Regeln gesetzt wurden.
- `reasoning_summary` – Kurzer Auszug aus dem LLM-Reasoning. Nutze ihn, um kritische Annahmen festzuhalten (z. B. „Netzbetreiber antwortet binnen 3 WT mit 44002 oder 44003“).
- `last_synced` – Wird automatisch gesetzt, wenn du `npm run definitions:generate` ausführst. Damit erkennst du, ob eine Definition auf aktuellem Wissen basiert.

### Beispielspezifika aus Willi Mako

- **GPKE**: Modelle typischerweise Zustände `pending`, `confirmed`, `rejected`, `escalated`. Laut Willi Mako sollten Ablehnungsgründe (technisch/fachlich) dokumentiert sein, da sie häufig als Eskalationspfad in Ticketsysteme gespiegelt werden.
- **WiM**: Ergänze in `states` Hinweise auf Messwertqualitäten (`plausible`, `estimated`). Willi Mako führt aus, dass Netzbetreiber oft automatische Prüfungen auf OBIS-Kombinationen haben – halte entsprechende Validierungen bereit.
- **GeLi Gas**: Füge längere SLAs in `timeline` hinzu (typisch fünf Werktage). MCP-Hintergründe betonen, dass Eskalationen meist über Telefon erfolgen; notiere daher im `documentation`-Block Ansprechpartner oder Prozesshinweise.

## Authoring Tips

1. Start from official AHB/MIG documentation and cross-check with the Willi Mako knowledge base to ensure accuracy.
2. Prefer explicit `description` fields in German; operators often use them as runbooks.
3. Keep IDs lower-case with hyphens. They become package exports and queue names.
4. Run `npm run definitions:validate` before committing to guarantee schema alignment.
5. Add integration tests whenever new states or validations change routing behaviour.
6. Bei Änderungen an Prüfidentifikatoren: Prüfe in Willi Mako nach Updates (z. B. neue Fristenkataloge) und aktualisiere `knowledge_base_ids`, damit zukünftige Syncs die Quelle kennen.
