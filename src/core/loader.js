const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class ProcessDefinitionLoader {
  constructor(definitionsPath, options = {}) {
    this.definitionsPath = definitionsPath || path.join(__dirname, '../../definitions');
    this.cache = new Map();
    this.schema = null;
    this.options = {
      enableCache: options.enableCache ?? true,
      validateOnLoad: options.validateOnLoad ?? true,
      ajvOptions: { allErrors: true, strict: false },
      ...options
    };
  }

  async loadSchema() {
    if (this.schema) return this.schema;

    const schemaPath = path.join(__dirname, '../../definitions/schemas/process-definition.schema.json');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    this.schema = JSON.parse(schemaContent);
    return this.schema;
  }

  async loadAll(category = null) {
    const categories = category ? [category] : ['gpke', 'wim', 'geli-gas', 'mabis'];
    const processes = [];

    for (const cat of categories) {
      const categoryPath = path.join(this.definitionsPath, cat);

      try {
        const files = await fs.readdir(categoryPath);

        for (const file of files) {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            const process = await this.load(path.join(categoryPath, file));
            if (process) processes.push(process);
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    return new ProcessRegistry(processes);
  }

  async load(filePath) {
    const cacheKey = path.resolve(filePath);

    if (this.options.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const content = await fs.readFile(filePath, 'utf8');
    const definition = yaml.load(content);

    if (this.options.validateOnLoad) {
      await this.validate(definition, filePath);
    }

    const processDefinition = new ProcessDefinition(definition, filePath);

    if (this.options.enableCache) {
      this.cache.set(cacheKey, processDefinition);
    }

    return processDefinition;
  }

  async validate(definition, filePath = 'unknown') {
    const schema = await this.loadSchema();
    const ajv = new Ajv(this.options.ajvOptions);
    addFormats(ajv);
    const validate = ajv.compile(schema);

    const valid = validate(definition);

    if (!valid) {
      const errors = validate.errors.map(err => ({
        path: err.instancePath,
        message: err.message,
        params: err.params
      }));

      throw new ValidationError(`Process definition invalid: ${filePath}`, errors);
    }

    return true;
  }
}

class ProcessDefinition {
  constructor(definition, sourcePath) {
    this.raw = definition;
    this.sourcePath = sourcePath;
    this.id = definition.process?.id;
    this.name = definition.process?.name;
    this.category = definition.process?.category;
    this.version = definition.process?.version;
    this.trigger = definition.trigger;
    this.responses = definition.responses || [];
    this.states = definition.states || {};
    this.validations = definition.validations || [];
    this.metadata = definition.process?.willi_mako_context || {};
  }

  getState(stateName) {
    return this.states[stateName];
  }

  getExpectedResponses(fromState = null) {
    if (!fromState) return this.responses;

    return this.responses.filter(resp => {
      const state = this.states[fromState];
      return !state || !state.expected_responses || state.expected_responses.includes(resp.pruefidentifikator);
    });
  }

  getMaxWaitTime(unit = 'days') {
    if (!this.responses.length) return 0;
    const maxDays = Math.max(...this.responses.map(r => r.max_wait_days || 0));

    switch (unit) {
      case 'hours':
        return maxDays * 24;
      case 'minutes':
        return maxDays * 24 * 60;
      case 'ms':
        return maxDays * 24 * 60 * 60 * 1000;
      default:
        return maxDays;
    }
  }

  matchesMessage(message) {
    const triggerType = this.trigger?.message_type;
    const triggerId = this.trigger?.pruefidentifikator;
    const messageType = message?.metadata?.message_type;
    const pruefId = message?.metadata?.pruefidentifikator?.id;
    return triggerType === messageType && triggerId === pruefId;
  }

  toJSON() {
    return this.raw;
  }
}

class ProcessRegistry {
  constructor(processes = []) {
    this.processes = processes;
    this.byId = new Map();
    this.byPruefidentifikator = new Map();
    this.byCategory = new Map();

    this.buildIndexes();
  }

  buildIndexes() {
    for (const process of this.processes) {
      if (!process?.id) continue;
      this.byId.set(process.id, process);

      const pruefId = process.trigger?.pruefidentifikator;
      if (pruefId) {
        this.byPruefidentifikator.set(pruefId, process);
      }

      const category = process.category;
      if (category) {
        if (!this.byCategory.has(category)) {
          this.byCategory.set(category, []);
        }
        this.byCategory.get(category).push(process);
      }
    }
  }

  findById(id) {
    return this.byId.get(id);
  }

  findByPruefidentifikator(pruefId) {
    return this.byPruefidentifikator.get(pruefId);
  }

  findByCategory(category) {
    return this.byCategory.get(category) || [];
  }

  findByMessage(message) {
    const pruefId = message?.metadata?.pruefidentifikator?.id;
    if (!pruefId) return null;
    return this.findByPruefidentifikator(pruefId);
  }

  getAll() {
    return this.processes;
  }

  size() {
    return this.processes.length;
  }
}

class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

module.exports = {
  ProcessDefinitionLoader,
  ProcessDefinition,
  ProcessRegistry,
  ValidationError
};
