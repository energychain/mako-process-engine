const path = require('path');
const { ProcessDefinitionLoader } = require('../core/loader');

class TransformerProcessPlugin {
  constructor(definitionsPath) {
    const resolvedDefinitions = definitionsPath || path.join(__dirname, '../../definitions');
    this.loader = new ProcessDefinitionLoader(resolvedDefinitions);
    this.registry = null;
  }

  async initialize() {
    if (!this.registry) {
      this.registry = await this.loader.loadAll();
    }
  }

  async enrich(json, segments) {
    if (!this.registry) await this.initialize();

    const process = this.registry.findByMessage(json);

    if (process) {
      json.process = {
        id: process.id,
        name: process.name,
        category: process.category,
        current_state: 'pending',
        expected_responses: process.getExpectedResponses().map(r => ({
          pruefidentifikator: r.pruefidentifikator,
          max_wait_days: r.max_wait_days,
          description: r.description
        })),
        max_wait_time_days: process.getMaxWaitTime(),
        validations: this.validateAgainstProcess(json, process)
      };
    }

    return json;
  }

  validateAgainstProcess(message, process) {
    const errors = [];
    const warnings = [];

    for (const validation of process.validations) {
      const value = this.getNestedValue(message, validation.field);
      const isValid = this.applyRule(value, validation.rule);

      if (!isValid) {
        const issue = {
          field: validation.field,
          rule: validation.rule,
          message: validation.message,
          severity: validation.severity
        };

        if (validation.severity === 'error') {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }

    return { errors, warnings, is_valid: errors.length === 0 };
  }

  getNestedValue(obj, fieldPath) {
    return fieldPath.split('.').reduce((current, key) => {
      if (current === undefined || current === null) return undefined;

      const arrayMatch = key.match(/^([\w-]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        return current[arrayKey]?.[parseInt(index, 10)];
      }

      return current[key];
    }, obj);
  }

  applyRule(value, rule) {
    switch (rule) {
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_empty':
        return Array.isArray(value) ? value.length > 0 : Boolean(value);
      case 'length_equals_11':
        return typeof value === 'string' && value.length === 11;
      case 'valid_mp_id':
        return typeof value === 'string' && /^\d{13}$/.test(value);
      case 'future_date':
        return value ? new Date(value) > new Date() : false;
      default:
        return true;
    }
  }
}

module.exports = { TransformerProcessPlugin };
