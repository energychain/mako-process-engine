const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');

const {
  getRequiredEnv,
  describeConfigError
} = require('../config/env');

const DEFAULT_CATEGORY_HINTS = ['gpke', 'wim', 'geli-gas'];
const STATIC_FALLBACK_IDS = {
  gpke: ['44001', '44002', '44003', '44004', '44016'],
  wim: ['17009', '19015'],
  'geli-gas': []
};

class WilliMakoProcessSync {
  constructor(clientFactory) {
    this.createClient = clientFactory;
    this.client = null;
    this.sessionId = null;
  }

  async initialize() {
    if (!this.client) {
      this.client = await this.createClient();
    }
    if (!this.sessionId) {
      const session = await this.client.createSession({
        contextSettings: {
          focus: 'mako-prozesse',
          detailLevel: 'technical'
        }
      });
      const sessionId = session?.data?.sessionId;
      if (!sessionId) {
        throw new Error(`Failed to create Willi Mako session: ${JSON.stringify(session)}`);
      }
      this.sessionId = sessionId;
    }
  }

  async generateProcessDefinition(pruefidentifikator, categoryHint) {
    await this.initialize();

    const searchResponse = await this.client.semanticSearch({
      sessionId: this.sessionId,
      query: `Liste strukturierte Informationen zum Prüfidentifikator ${pruefidentifikator} (${categoryHint || 'GPKE/WiM/GeLi Gas'}).`,
      options: {
        limit: 10,
        outlineScoping: true
      }
    });

    const searchData = searchResponse?.data ?? {};
    const reasoningPrompt = this.buildDefinitionPrompt(pruefidentifikator, categoryHint);
    const contextMessages = this.buildContextMessages(searchData);
    const reasoningResponse = await this.client.generateReasoning({
      sessionId: this.sessionId,
      query: `Erstelle die Prozessdefinition für Prüfidentifikator ${pruefidentifikator} als JSON ohne Erläuterung.`,
      messages: [
        {
          role: 'system',
          content: reasoningPrompt
        },
        ...contextMessages
      ],
      useDetailedIntentAnalysis: true
    });

    const reasoningData = reasoningResponse?.data ?? {};

    if (searchResponse?.success === false) {
      throw new Error(`Semantic search failed: ${JSON.stringify(searchResponse)}`);
    }
    if (reasoningResponse?.success === false) {
      throw new Error(`Reasoning request failed: ${JSON.stringify(reasoningResponse)}`);
    }

    return this.parseReasoningToDefinition(pruefidentifikator, reasoningData, searchData, categoryHint);
  }

  buildDefinitionPrompt(pruefidentifikator, categoryHint) {
    const category = (categoryHint || '').toUpperCase();
    const categoryLine = category ? `Kontext: Kategorie ${category}.` : 'Kontext: GPKE, WiM oder GeLi Gas.';
    return `Erstelle eine vollständige Prozessdefinition für den Prüfidentifikator ${pruefidentifikator}.
${categoryLine}
Liefere ausschließlich JSON ohne zusätzlichen Text im folgenden Format:
{
  "process": {
    "id": "string",
    "name": "string",
    "category": "GPKE | WiM | GeLi Gas | MaBiS",
    "version": "2.6",
    "description": "string",
    "bdew_reference": "string | null"
  },
  "trigger": {
    "message_type": "UTILMD | MSCONS | ORDERS | ORDRSP | INVOIC | APERAK | CONTRL",
    "pruefidentifikator": "string",
    "direction": "inbound | outbound | bidirectional",
    "sender_role": "string",
    "receiver_role": "string"
  },
  "responses": [
    {
      "message_type": "UTILMD | MSCONS | ORDERS | ORDRSP | INVOIC | APERAK | CONTRL",
      "pruefidentifikator": "string",
      "description": "string",
      "max_wait_days": 0,
      "transitions_to": "string"
    }
  ],
  "states": {
    "pending": {
      "name": "string",
      "is_final": false,
      "expected_responses": ["string"],
      "timeout_days": 0
    },
    "completed": {
      "name": "string",
      "is_final": true,
      "expected_responses": [],
      "timeout_days": 0
    }
  },
  "validations": [
    {
      "field": "string",
      "rule": "exists | not_empty | length_equals_11 | valid_mp_id | future_date",
      "severity": "error | warning",
      "message": "string"
    }
  ]
}
Alle Zeitangaben in Tagen. Keine Kommentare, nur JSON.
Wenn Werte unbekannt sind, schätze diese auf Basis des Kontexts und markiere sie mit "TODO" statt Felder auszulassen.`;
  }

  parseReasoningToDefinition(pruefidentifikator, reasoningData, searchData, categoryHint) {
    const responseText = typeof reasoningData?.response === 'string' ? reasoningData.response.trim() : '';
    const parsed = this.safeJsonParse(responseText);
    const base = this.ensureDefinitionShape(parsed);
    const knowledgeResults = Array.isArray(searchData?.results) ? searchData.results : [];
    const knowledgeIds = knowledgeResults
      .map(item => item?.id)
      .filter(id => typeof id === 'string' && id.length > 0);

    const fallbackText = responseText;
    const normalizedCategory = this.normalizeCategory(
      base.process.category || categoryHint || this.extractCategory(fallbackText)
    );

    base.process = {
      ...base.process,
      id: base.process.id || this.extractProcessId(fallbackText, pruefidentifikator),
      name: base.process.name || this.extractProcessName(fallbackText, pruefidentifikator),
      category: normalizedCategory,
      version: base.process.version || '2.6',
      description: base.process.description || this.extractDescription(fallbackText),
      bdew_reference: base.process.bdew_reference || this.extractBDEWReference(knowledgeResults)
    };

    if (!base.trigger || Object.keys(base.trigger).length === 0) {
      base.trigger = this.extractTrigger(fallbackText, pruefidentifikator);
    }

    if (!Array.isArray(base.responses) || base.responses.length === 0) {
      base.responses = this.extractResponses(fallbackText);
    }

    if (!base.states || Object.keys(base.states).length === 0) {
      base.states = this.extractStates(fallbackText);
    }

    if (!Array.isArray(base.validations) || base.validations.length === 0) {
      base.validations = this.extractValidations(fallbackText);
    }

    const contextMeta = this.cleanObject({
      ...(base.process.willi_mako_context || {}),
      session_id: reasoningData?.sessionId || searchData?.sessionId || this.sessionId,
      knowledge_base_ids: knowledgeIds.length ? knowledgeIds : undefined,
      reasoning_quality: reasoningData?.finalQuality,
      reasoning_iterations: reasoningData?.iterationsUsed,
      reasoning_steps: Array.isArray(reasoningData?.reasoningSteps) ? reasoningData.reasoningSteps.length : undefined,
      search_query: searchData?.query,
      total_results: searchData?.totalResults,
      search_duration_ms: searchData?.durationMs,
      response_format: parsed ? 'json' : 'text',
      reasoning_summary: reasoningData?.contextAnalysis?.summary,
      raw_response: parsed ? undefined : responseText || undefined,
      captured_at: new Date().toISOString()
    });

    if (Object.keys(contextMeta).length > 0) {
      base.process.willi_mako_context = contextMeta;
    }

    return this.sanitizeDefinition(base, pruefidentifikator);
  }

  async updateProcessDefinition(definitionPath) {
    await this.initialize();
    const content = await fs.readFile(definitionPath, 'utf8');
    const definition = yaml.load(content);

    const pruefId = definition?.trigger?.pruefidentifikator;
    if (!pruefId) {
      throw new Error(`Missing prüfidentifikator in ${definitionPath}`);
    }

    const updates = await this.generateProcessDefinition(pruefId, definition?.process?.category);

    return {
      ...definition,
      ...updates,
      process: {
        ...definition.process,
        ...updates.process
      }
    };
  }

  async generateAllProcesses(outputDir, categories) {
    await this.initialize();

    const targets = categories
      ? this.normalizeTargetMap(categories)
      : await this.buildDefaultTargetMap();

    for (const [category, ids] of Object.entries(targets)) {
      const categoryDir = path.join(outputDir, category);
      await fs.mkdir(categoryDir, { recursive: true });
      const indexEntries = [];

      for (const pruefId of ids) {
        try {
          console.log(`Synchronising ${category.toUpperCase()} Prüfi ${pruefId} ...`);
          const definition = await this.generateProcessDefinition(pruefId, category);
          const yamlContent = yaml.dump(definition, { indent: 2, lineWidth: 120 });
          const filename = `${pruefId}-${definition.process.id}.yaml`;
          const filepath = path.join(categoryDir, filename);
          await this.removeExistingDefinitions(categoryDir, pruefId, filename);
          await fs.writeFile(filepath, yamlContent, 'utf8');
          console.log(`✔ Saved ${filepath}`);
          indexEntries.push({
            id: definition.process.id,
            pruefidentifikator: pruefId,
            name: definition.process.name || '',
            file: filename,
            version: definition.process.version || '2.6',
            category: definition.process.category || category
          });
        } catch (error) {
          console.error(`Failed to generate ${pruefId}: ${this.formatError(error)}`);
        }
      }

      if (indexEntries.length > 0) {
        const versionEntry = indexEntries.find(entry => entry.version && !entry.version.toUpperCase().includes('TODO'));
        const version = versionEntry?.version || '2.6';
        const categoryEntry = indexEntries.find(entry => entry.category && !entry.category.toUpperCase().includes('TODO'));
        const categoryLabel = categoryEntry?.category || category.toUpperCase();
        const processes = indexEntries
          .map(({ version: _version, category: _category, ...rest }) => rest)
          .sort((a, b) => a.pruefidentifikator.localeCompare(b.pruefidentifikator));

        const indexPayload = {
          category: categoryLabel,
          version,
          generated_at: new Date().toISOString(),
          processes
        };

        await fs.writeFile(
          path.join(categoryDir, 'index.json'),
          `${JSON.stringify(indexPayload, null, 2)}\n`,
          'utf8'
        );
      }
    }
  }

  async buildDefaultTargetMap() {
    const discovered = await this.discoverDefaultTargets(DEFAULT_CATEGORY_HINTS);
    const targets = {};

    for (const category of DEFAULT_CATEGORY_HINTS) {
      const fallback = STATIC_FALLBACK_IDS[category] || [];
      const discoveredIds = discovered[category] || [];
      const merged = new Set([...fallback.map(String), ...discoveredIds.map(String)]);
      if (merged.size > 0) {
        targets[category] = Array.from(merged);
      }
    }

    return targets;
  }

  normalizeTargetMap(rawTargets) {
    const normalized = {};
    for (const [category, ids] of Object.entries(rawTargets)) {
      const values = Array.isArray(ids) ? ids : [ids];
      const unique = new Set(values.map(value => value && value.toString().trim()).filter(Boolean));
      if (unique.size > 0) {
        normalized[category] = Array.from(unique);
      }
    }
    return normalized;
  }

  async discoverDefaultTargets(categories) {
    const result = {};

    for (const category of categories) {
      try {
        const ids = await this.discoverPruefidentifikatoren(category);
        if (ids.length > 0) {
          result[category] = ids;
        }
      } catch (error) {
        console.warn(`Could not discover Prüfi for ${category}: ${this.formatError(error)}`);
      }
    }

    return result;
  }

  async discoverPruefidentifikatoren(category, limit = 6) {
    await this.initialize();

    const reasoning = await this.client.generateReasoning({
      sessionId: this.sessionId,
      query: [
        `Nenne die wichtigsten ${limit} Prüfidentifikatoren für ${category.toUpperCase()} in der deutschen Marktkommunikation.`,
        'Gib ausschließlich JSON zurück: {"pruefidentifikatoren": ["44001", "..."]}.',
        'Nur eindeutige fünfstellige Nummern als Strings, keine Erläuterung.'
      ].join(' '),
      messages: [
        {
          role: 'system',
          content: 'Antworte ohne Einleitung ausschließlich mit JSON {"pruefidentifikatoren": ["44001", "..."]}.'
        }
      ],
      useDetailedIntentAnalysis: false
    });

    const parsed = this.safeJsonParse(reasoning?.data?.response);
    if (!parsed || !Array.isArray(parsed.pruefidentifikatoren)) {
      return [];
    }

    return Array.from(new Set(parsed.pruefidentifikatoren.map(value => value && value.toString().trim()).filter(Boolean)));
  }

  sanitizeDefinition(definition, pruefidentifikator) {
    // Normalises generator output to match the JSON schema and downstream routing assumptions.
    definition.process = definition.process || {};
    definition.process.id = this.slugifyId(definition.process.id) || `process-${pruefidentifikator}`;
    definition.process.name = definition.process.name || `Prozess ${pruefidentifikator}`;
    definition.process.category = this.normalizeCategory(definition.process.category);
    definition.process.version = definition.process.version || '2.6';
    if (typeof definition.process.bdew_reference === 'string') {
      if (definition.process.bdew_reference.toUpperCase().includes('TODO') || !definition.process.bdew_reference.trim()) {
        delete definition.process.bdew_reference;
      }
    } else {
      delete definition.process.bdew_reference;
    }

    definition.trigger = definition.trigger || {};
    definition.trigger.message_type = this.normalizeMessageType(definition.trigger.message_type, 'UTILMD');
    definition.trigger.pruefidentifikator = this.extractPruefidentifikator(definition.trigger.pruefidentifikator) || pruefidentifikator;
    definition.trigger.direction = this.normalizeDirection(definition.trigger.direction, 'bidirectional');
    definition.trigger.sender_role = (definition.trigger.sender_role || 'LF').toUpperCase();
    definition.trigger.receiver_role = (definition.trigger.receiver_role || 'NB').toUpperCase();

    const stateKeyMap = {};
    const sanitizedStates = {};
    let stateIndex = 1;
    const originalStates = definition.states && typeof definition.states === 'object' ? definition.states : {};
    for (const [originalKey, state] of Object.entries(originalStates)) {
      const targetKey = this.slugifyStateKey(originalKey || state?.name || `state_${stateIndex}`) || `state_${stateIndex}`;
      stateIndex += 1;
      stateKeyMap[originalKey] = targetKey;
      sanitizedStates[targetKey] = {
        name: state?.name || this.toTitleCase(targetKey),
        description: state?.description,
        is_final: Boolean(state?.is_final) && targetKey !== 'pending',
        timeout_days: typeof state?.timeout_days === 'number' ? state.timeout_days : undefined,
        expected_responses: Array.isArray(state?.expected_responses)
          ? state.expected_responses.map(item => this.extractPruefidentifikator(item) || item).filter(Boolean)
          : []
      };
    }

    if (!sanitizedStates.pending) {
      sanitizedStates.pending = {
        name: 'Ausstehend',
        is_final: false,
        expected_responses: [],
        timeout_days: undefined
      };
    }
    stateKeyMap.pending = 'pending';

    if (!sanitizedStates.completed) {
      sanitizedStates.completed = {
        name: 'Abgeschlossen',
        is_final: true,
        expected_responses: [],
        timeout_days: 0
      };
    }
    stateKeyMap.completed = 'completed';

    definition.states = sanitizedStates;

    const normalizedResponses = (definition.responses || []).map(response => {
      const responseId = this.extractPruefidentifikator(response.pruefidentifikator) || definition.trigger.pruefidentifikator;
      const messageType = this.normalizeMessageType(response.message_type, definition.trigger.message_type === 'ORDERS' ? 'ORDRSP' : 'APERAK');
      const rawTransition = response.transitions_to || 'completed';
      const targetState = stateKeyMap[rawTransition] || (definition.states[rawTransition] ? rawTransition : 'completed');
      const description = response.description && !response.description.toUpperCase().includes('TODO')
        ? response.description
        : `Automatische Antwort für Prüfidentifikator ${responseId}.`;

      if (!definition.states.pending.expected_responses.includes(responseId)) {
        definition.states.pending.expected_responses.push(responseId);
      }

      return {
        message_type: messageType,
        pruefidentifikator: responseId,
        direction: this.normalizeDirection(response.direction, definition.trigger.direction),
        description,
        max_wait_days: Number.isFinite(response.max_wait_days) ? response.max_wait_days : 3,
        transitions_to: targetState
      };
    });

    if (normalizedResponses.length === 0) {
      const fallbackResponseId = definition.trigger.pruefidentifikator;
      normalizedResponses.push({
        message_type: this.normalizeMessageType(null, 'APERAK'),
        pruefidentifikator: fallbackResponseId,
        direction: this.normalizeDirection(null, definition.trigger.direction),
        description: `Automatische Antwort für Prüfidentifikator ${fallbackResponseId}.`,
        max_wait_days: 3,
        transitions_to: 'completed'
      });
      if (!definition.states.pending.expected_responses.includes(fallbackResponseId)) {
        definition.states.pending.expected_responses.push(fallbackResponseId);
      }
    }

    definition.responses = normalizedResponses;

    definition.validations = (definition.validations || []).map(validation => ({
      field: validation.field || 'message.header',
      rule: this.normalizeValidationRule(validation.rule),
      message: validation.message && !validation.message.toUpperCase().includes('TODO')
        ? validation.message
        : 'Automatisch generierte Validierung.',
      severity: ['error', 'warning', 'info'].includes(validation.severity) ? validation.severity : 'error'
    }));

    definition.states.pending.expected_responses = Array.from(new Set(definition.states.pending.expected_responses));

    if (Array.isArray(definition.states.completed.expected_responses)) {
      definition.states.completed.expected_responses = Array.from(new Set(definition.states.completed.expected_responses));
    }

    return definition;
  }

  async removeExistingDefinitions(directory, pruefId, currentFile) {
    const entries = await fs.readdir(directory).catch(() => []);
    await Promise.all(entries
      .filter(name => name.startsWith(`${pruefId}-`) && name !== currentFile)
      .map(name => fs.rm(path.join(directory, name)).catch(() => undefined)));
  }

  buildContextMessages(searchData) {
    const results = Array.isArray(searchData?.results) ? searchData.results : [];
    if (!results.length) {
      return [];
    }

    const snippets = results.slice(0, 3).map((item, index) => {
      const source = item?.payload?.source || item?.payload?.document || `Quelle ${index + 1}`;
      const text = item?.payload?.text || item?.highlight || '';
      const trimmed = this.truncate(text, 900);
      if (!trimmed) return null;
      return `Quelle ${index + 1}: ${source}\n${trimmed}`;
    }).filter(Boolean);

    if (!snippets.length) {
      return [];
    }

    return [
      {
        role: 'user',
        content: `Kontextauszüge aus der Willi-Mako Wissensbasis:\n\n${snippets.join('\n\n')}`
      }
    ];
  }

  extractProcessId(source, fallback) {
    if (source && source.process && typeof source.process.id === 'string') {
      return source.process.id;
    }
    const match = typeof source === 'string' ? source.match(/process[_-]id:\s*([a-z0-9-]+)/i) : null;
    return match ? match[1] : `process-${fallback}`;
  }

  extractProcessName(source, fallback) {
    if (source && source.process && typeof source.process.name === 'string') {
      return source.process.name;
    }
    const match = typeof source === 'string' ? source.match(/name:\s*"([^"]+)"/i) : null;
    return match ? match[1] : `Prozess ${fallback}`;
  }

  extractCategory(source) {
    if (source && source.process && typeof source.process.category === 'string') {
      return source.process.category;
    }
    if (typeof source !== 'string') {
      return null;
    }
    const categories = ['GPKE', 'WiM', 'GeLi Gas', 'MaBiS'];
    for (const cat of categories) {
      if (source.toLowerCase().includes(cat.toLowerCase())) {
        return cat;
      }
    }
    return null;
  }

  extractDescription(source) {
    if (source && source.process && typeof source.process.description === 'string') {
      return source.process.description;
    }
    if (typeof source !== 'string') return 'Beschreibung wird durch Willi Mako ergänzt.';
    const match = source.match(/description:\s*"([^"]+)"/i);
    return match ? match[1] : 'Beschreibung wird durch Willi Mako ergänzt.';
  }

  extractBDEWReference(results) {
    for (const item of results || []) {
      const candidate = item?.payload?.bdew_reference || item?.payload?.bdewReference || item?.metadata?.bdewReference;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    return null;
  }

  extractTrigger(source, pruefidentifikator) {
    if (source && source.trigger && typeof source.trigger === 'object') {
      return source.trigger;
    }
    const text = typeof source === 'string' ? source : '';
    const messageTypeMatch = text.match(/message_type:\s*(UTILMD|MSCONS|ORDERS|ORDRSP|INVOIC|APERAK|CONTRL)/i);
    const pruefIdMatch = text.match(/pruefidentifikator:\s*(\d{5})/i);
    const directionMatch = text.match(/direction:\s*(inbound|outbound|bidirectional)/i);

    return {
      message_type: messageTypeMatch ? messageTypeMatch[1].toUpperCase() : 'UTILMD',
      pruefidentifikator: pruefIdMatch ? pruefIdMatch[1] : pruefidentifikator,
      direction: directionMatch ? directionMatch[1] : 'bidirectional',
      sender_role: this.extractField(text, 'sender_role') || 'unbekannt',
      receiver_role: this.extractField(text, 'receiver_role') || 'unbekannt'
    };
  }

  extractResponses(source) {
    if (source && Array.isArray(source.responses)) {
      return source.responses;
    }
    const text = typeof source === 'string' ? source : '';
    const matches = text.match(/responses:\s*\[(.*?)\]/is);
    if (!matches) return [];
    try {
      const cleaned = matches[1]
        .replace(/([a-z_]+):/gi, '"$1":')
        .replace(/'([^']*)'/g, '"$1"');
      return JSON.parse(`[${cleaned}]`);
    } catch (_error) {
      return [];
    }
  }

  extractStates(source) {
    if (source && source.states && typeof source.states === 'object') {
      return source.states;
    }
    const text = typeof source === 'string' ? source : '';
    const match = text.match(/states:\s*\{([\s\S]+?)\}\s*(responses|validations|$)/i);
    if (!match) return {};
    try {
      const jsonLike = match[1]
        .replace(/([a-z_]+):/gi, '"$1":')
        .replace(/'([^']*)'/g, '"$1"');
      return JSON.parse(`{${jsonLike}}`);
    } catch (_error) {
      return {};
    }
  }

  extractValidations(source) {
    if (source && Array.isArray(source.validations)) {
      return source.validations;
    }
    const text = typeof source === 'string' ? source : '';
    const match = text.match(/validations:\s*\[(.*?)\]/is);
    if (!match) return [];
    try {
      const cleaned = match[1]
        .replace(/([a-z_]+):/gi, '"$1":')
        .replace(/'([^']*)'/g, '"$1"');
      return JSON.parse(`[${cleaned}]`);
    } catch (_error) {
      return [];
    }
  }

  extractField(text, fieldName) {
    if (typeof text !== 'string') return null;
    const regex = new RegExp(`${fieldName}:[\\s"]*([A-Za-z0-9_-]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1] : null;
  }

  normalizeCategory(value) {
    if (!value) return 'GPKE';
    const normalized = value.toString().trim().toLowerCase();
    if (normalized.includes('geli')) return 'GeLi Gas';
    if (normalized === 'gpke') return 'GPKE';
    if (normalized === 'wim') return 'WiM';
    if (normalized.includes('mabis')) return 'MaBiS';
    return value;
  }

  ensureDefinitionShape(parsed) {
    const base = parsed && typeof parsed === 'object' ? parsed : {};
    return {
      process: base.process && typeof base.process === 'object' ? { ...base.process } : {},
      trigger: base.trigger && typeof base.trigger === 'object' ? { ...base.trigger } : {},
      responses: Array.isArray(base.responses) ? [...base.responses] : [],
      states: base.states && typeof base.states === 'object' ? { ...base.states } : {},
      validations: Array.isArray(base.validations) ? [...base.validations] : [],
      documentation: base.documentation && typeof base.documentation === 'object' ? { ...base.documentation } : {}
    };
  }

  safeJsonParse(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }
    try {
      const trimmed = value.trim();
      const fenced = trimmed.match(/```(?:json)?\n([\s\S]*?)```/i);
      const jsonPayload = fenced ? fenced[1].trim() : trimmed;
      return JSON.parse(jsonPayload);
    } catch (_error) {
      return null;
    }
  }

  cleanObject(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, value]) => {
        if (value === undefined || value === null) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
      })
    );
  }

  truncate(value, maxLength = 900) {
    if (!value) return '';
    const text = value.toString();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  }

  normalizeMessageType(value, fallback) {
    const allowed = ['UTILMD', 'MSCONS', 'ORDERS', 'ORDRSP', 'INVOIC', 'APERAK', 'CONTRL'];
    if (!value) return fallback;
    const upper = value.toString().toUpperCase();
    if (allowed.includes(upper)) {
      return upper;
    }
    const match = allowed.find(type => upper.includes(type));
    return match || fallback;
  }

  normalizeDirection(value, fallback) {
    const allowed = ['inbound', 'outbound', 'bidirectional'];
    if (!value) return fallback || 'bidirectional';
    const lower = value.toString().toLowerCase();
    if (allowed.includes(lower)) {
      return lower;
    }
    return fallback || 'bidirectional';
  }

  normalizeValidationRule(value) {
    const allowed = ['exists', 'not_empty', 'length_equals_11', 'valid_mp_id', 'future_date'];
    if (!value) return 'exists';
    const lower = value.toString().toLowerCase();
    if (allowed.includes(lower)) {
      return lower;
    }
    return 'exists';
  }

  extractPruefidentifikator(value) {
    if (!value) return null;
    const text = value.toString();
    const exactMatch = text.match(/(\d{5})/);
    if (exactMatch) {
      return exactMatch[1];
    }
    const digitMatch = text.match(/(\d+)/);
    if (digitMatch) {
      const digits = digitMatch[1];
      const trimmed = digits.length >= 5 ? digits.slice(-5) : digits.padStart(5, '0');
      return trimmed;
    }
    return '00000';
  }

  slugifyId(value) {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  slugifyStateKey(value) {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  toTitleCase(value) {
    if (!value) return '';
    return value
      .toString()
      .split(/[_-]/)
      .filter(segment => segment.length > 0)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  formatError(error) {
    if (!error) return 'Unknown error';
    if (error.body) {
      const body = typeof error.body === 'string' ? error.body : JSON.stringify(error.body, null, 2);
      const message = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
      const status = error.status || 'unknown';
      return `${message} (status ${status}) ${body}`;
    }
    if (error instanceof Error) {
      return describeConfigError(error);
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch (_err) {
      return String(error);
    }
  }
}

const defaultClientFactory = async () => {
  const { WilliMakoClient } = await import('willi-mako-client');
  const token = getRequiredEnv(
    'WILLI_MAKO_TOKEN',
    'Create a personal access token in the Willi Mako portal and set WILLI_MAKO_TOKEN in your .env file.'
  );

  return new WilliMakoClient({
    token,
    apiKey: token
  });
};

const createWilliMakoProcessSync = (clientFactory = defaultClientFactory) => {
  return new WilliMakoProcessSync(clientFactory);
};

module.exports = {
  WilliMakoProcessSync,
  createWilliMakoProcessSync
};
