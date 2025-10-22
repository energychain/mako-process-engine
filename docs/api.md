# API Reference

## `ProcessDefinitionLoader`

- `constructor(definitionsPath?, options?)`
  - `definitionsPath` defaults to the bundled `definitions` directory.
  - `options.enableCache` (default `true`) caches parsed definitions.
  - `options.validateOnLoad` (default `true`) enforces schema validation.
- `loadAll(category?)` → `ProcessRegistry`
- `load(filePath)` → `ProcessDefinition`
- `validate(definition, filePath?)` → `true` or throws `ValidationError`

## `ProcessRegistry`

- `findById(id)`
- `findByPruefidentifikator(pruefId)`
- `findByCategory(category)`
- `findByMessage(message)` – expects `message.metadata.pruefidentifikator.id`
- `getAll()`
- `size()`

## `ProcessDefinition`

- `getState(stateName)`
- `getExpectedResponses(fromState?)`
- `getMaxWaitTime(unit = 'days')` – use `hours`, `minutes`, or `ms` for other units.
- `matchesMessage(message)`
- `toJSON()` – returns raw YAML data.

## `TransformerProcessPlugin`

Plugin for `edifact-json-transformer` that enriches messages with process metadata. Call `initialize()` before the first message.

## `ProcessAwareRouter`

Uses `ProcessDefinitionLoader` to determine queue, priority, and expected responses. Optional `routerConfig.defaultQueue` prevents `unknown` return values.

## `WilliMakoProcessSync`

Wrapper around `@energychain/willi-mako-client` to generate and update definitions from the Willi Mako knowledge base. Instantiate via `createWilliMakoProcessSync()` to use default credentials.
