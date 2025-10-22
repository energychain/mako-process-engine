# Energy Market Basics for MaKo Automation

This short primer targets software engineers who are new to German energy regulation.

## Key Organisations

- **Bundesnetzagentur (BNetzA)** – Regulatory authority defining market communication timelines and compliance rules.
- **BDEW** – Industry association publishing process handbooks such as GPKE and WiM.
- **ÜNB and VNB** – Transmission and distribution system operators exchanging messages with suppliers and metering service providers.

## Message Standards

| Abbreviation | Description | Typical Use |
| ------------ | ----------- | ----------- |
| UTILMD | Stammdatenänderungen | Lieferantenwechsel, Anmeldung, Abmeldung |
| MSCONS | Messdaten | Übermittlung von Energieverbrauch |
| INVOIC | Rechnungen | Abrechnung für Lieferanten und ÜNB |
| APERAK | Application error and acknowledgement | Fehlermeldungen zu vorherigen Nachrichten |

All messages are formatted as EDIFACT documents. Each business case uses a **Prüfidentifikator** (five-digit code) to describe the process variant.

## Timelines

Processes have legally defined response windows (often 1–3 Werktage). Breaches can trigger escalation workflows or penalties. The YAML definitions include `max_wait_days` and state timeouts to help your systems stay compliant.

## Roles in Messages

- `Lieferant` (supplier)
- `Netzbetreiber` (distribution grid operator)
- `Messstellenbetreiber` (metering point operator)
- `ÜNB` (transmission system operator)

The `trigger.sender_role` and `trigger.receiver_role` fields clarify who initiates the process.

## Willi Mako Insights nach Prozessfamilien

### GPKE – Lieferantenwechsel Strom

- **Kernablauf**: Laut Willi Mako MCP startet der Standardfall mit Prüfidentifikator `44001` (Anmeldung). Netzbetreiber müssen innerhalb von drei Werktagen mit `44002` (Bestätigung) oder `44003` (Ablehnung) reagieren. Unsere Definition `gpke-anmeldung-nn` spiegelt diese Pfade inklusive SLA-Zeiten wider.
- **Häufige Ablehnungsgründe**: Fehlende oder ungültige Marktlokations-ID (`IDE+24`) und abweichende Lieferbeginndaten (`DTM+137`). Diese Punkte sind in den Validierungen hinterlegt, weil sie laut Willi Mako Knowledge Base die Top-3 Ursachen für Eskalationen darstellen.
- **Praxis-Tipp**: Setze im Monitoring ein Timeout auf drei Kalendertage und triggere eine Eskalation (`escalated` State), wenn keine Antwort vorliegt – genau wie im YAML-Modell beschrieben.

### WiM – Messwesen Strom

- **Kernablauf**: Prozesse rund um Zählerstandsermittlung verwenden Prüfidentifikatoren wie `17009` (Zählerstandsauftrag) und `19015` (Zählerstandsmeldung). Willi Mako listet hier strikte Fristen von einem Werktag für den Messstellenbetreiber.
- **Messdatenqualität**: Die MCP-Dokumentation betont, dass MSCONS-Nachrichten eine konsistente OBIS-Kennzeichnung brauchen. Wenn du neue Definitionen anlegst, füge Validierungen für `E17`/`E20` Felder ein, um Plausibilitätsprüfungen zu unterstützen.
- **Automatisierung**: Viele Versorger nutzen laut Willi Mako automatisierte Rückfragen, wenn erwartete Messwerte (`expected_responses`) nicht eintreffen. Nutze in `ProcessAwareRouter` die `expected_responses`, um Tickets oder Queue-Routing aufzubauen.

### GeLi Gas – Lieferantenwechsel Gas

- **Kernablauf**: Übliche Auslöser sind ORDRSP-Nachrichten mit Prüfidentifikatoren der `55xxx`-Serie. Die MCP-Wissensbasis weist darauf hin, dass Gasnetzbetreiber längere Fristen (bis zu fünf Werktage) haben – berücksichtige das in `max_wait_days`, wenn du neue Prozesse modellierst.
- **Datenbesonderheiten**: Gasprozesse verlangen laut Willi Mako häufig Angaben zur Bilanzierungsgebiet- und Marktgebiets-ID. Ergänze entsprechende Validierungen (`parties.netzbetreiber.market_area`) sobald du GeLi-Definitionen erweiterst.
- **Fehlermuster**: Häufige Ablehnungen entstehen durch veraltete Stammdaten im NAD-Segment. Dokumentiere bei neuen Definitionen Best-Practice-Hinweise im `documentation` Block, damit Entwickler:innen ohne tiefe GeLi-Kenntnisse wissen, worauf sie achten müssen.

## Recommended Next Steps

1. Explore the example process `definitions/gpke/44001-anmeldung-nn.yaml`.
2. Review official AHB documentation accessible via Willi Mako or the BDEW portal.
3. Integrate the loader into your validation pipeline to ensure outgoing messages meet regulatory expectations.
