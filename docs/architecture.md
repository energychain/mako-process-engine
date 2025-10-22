# Architecture

This project provides machine-readable process definitions and helper libraries for the German energy market communication (Marktkommunikation, "MaKo"). It is organised into four layers:

1. **Definitions** – YAML documents describing each process, including triggers, expected responses, and validation rules. They represent the source of truth for automation.
2. **Core loader** – A JavaScript API that reads the definitions, validates them against the JSON schema, and exposes a queryable registry.
3. **Integrations** – Plugins for downstream systems such as the EDIFACT transformer and message router. They use the registry to add process context and make routing decisions.
4. **Tooling** – Scripts and CI workflows that keep the definitions aligned with the Willi Mako knowledge base and guarantee schema integrity.

The repository is designed to be consumed as an npm package, but the plain YAML files can be reused in other environments. The automation-friendly structure keeps regulatory knowledge centralised and version-controlled.
