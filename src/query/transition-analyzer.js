class TransitionAnalyzer {
  constructor(process) {
    this.process = process;
  }

  expectedResponsesForState(stateName) {
    return this.process.getExpectedResponses(stateName);
  }

  isFinalState(stateName) {
    const state = this.process.getState(stateName);
    return Boolean(state?.is_final);
  }

  timeoutForState(stateName) {
    const state = this.process.getState(stateName);
    return state?.timeout_days || null;
  }
}

module.exports = { TransitionAnalyzer };
