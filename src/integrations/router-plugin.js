const path = require('path');
const { ProcessDefinitionLoader } = require('../core/loader');

class ProcessAwareRouter {
  constructor(definitionsPath, routerConfig = {}) {
    const resolvedDefinitions = definitionsPath || path.join(__dirname, '../../definitions');
    this.loader = new ProcessDefinitionLoader(resolvedDefinitions);
    this.registry = null;
    this.routerConfig = routerConfig;
    this.stateTracking = new Map();
  }

  async initialize() {
    if (!this.registry) {
      this.registry = await this.loader.loadAll();
    }
  }

  async route(message) {
    if (!this.registry) await this.initialize();

    const process = this.registry.findByMessage(message);

    if (!process) {
      return this.routerConfig.defaultQueue || 'unknown';
    }

    const routingInfo = {
      queue: this.determineQueue(message, process),
      priority: this.determinePriority(message, process),
      ttl: this.determineTTL(message, process),
      metadata: {
        process_id: process.id,
        process_name: process.name,
        category: process.category,
        expected_responses: process.getExpectedResponses()
      }
    };

    this.trackState(message, process);

    return routingInfo;
  }

  determineQueue(message, process) {
    const category = (process.category || 'unknown').toLowerCase().replace(/\s+/g, '-');
    const direction = process.trigger?.direction || 'bidirectional';
    const pruefId = message?.metadata?.pruefidentifikator?.id || 'unknown';
    return `${category}.${direction}.${pruefId}`;
  }

  determinePriority(message, process) {
    const ref = message?.metadata?.reference_number;
    const state = ref ? this.stateTracking.get(ref) : null;

    if (state?.state === 'pending') {
      return 'high';
    }

    if (state && this.isNearTimeout(state, process)) {
      return 'critical';
    }

    return 'normal';
  }

  determineTTL(message, process) {
    const maxWaitDays = process.getMaxWaitTime();
    return maxWaitDays * 24 * 60 * 60 * 1000;
  }

  trackState(message, process) {
    const refNumber = message?.metadata?.reference_number;
    if (!refNumber) return;

    const timeoutMs = process.getMaxWaitTime('ms');

    this.stateTracking.set(refNumber, {
      process_id: process.id,
      state: 'pending',
      created_at: new Date(),
      expected_timeout: timeoutMs ? new Date(Date.now() + timeoutMs) : null,
      expected_responses: process.getExpectedResponses().map(r => r.pruefidentifikator)
    });
  }

  isNearTimeout(state, process) {
    if (!state.expected_timeout) return false;
    const timeUntilTimeout = state.expected_timeout - Date.now();
    const warningThreshold = process.getMaxWaitTime('ms') * 0.2;
    return warningThreshold ? timeUntilTimeout < warningThreshold && timeUntilTimeout > 0 : false;
  }

  async onResponse(responseMessage, originalMessageId) {
    const state = originalMessageId ? this.stateTracking.get(originalMessageId) : null;

    if (!state || !this.registry) return;

    const process = this.registry.findById(state.process_id);
    if (!process) return;

    const responseId = responseMessage?.metadata?.pruefidentifikator?.id;
    const response = process.responses.find(r => r.pruefidentifikator === responseId);

    if (response) {
      state.state = response.transitions_to;
      state.completed_at = new Date();

      const targetState = process.getState(response.transitions_to);
      if (targetState?.is_final) {
        setTimeout(() => this.stateTracking.delete(originalMessageId), 86400000);
      }
    }
  }
}

module.exports = { ProcessAwareRouter };
