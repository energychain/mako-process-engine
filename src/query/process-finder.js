class ProcessFinder {
  constructor(registry) {
    this.registry = registry;
  }

  byPruefidentifikator(pruefId) {
    return this.registry.findByPruefidentifikator(pruefId);
  }

  byCategory(category) {
    return this.registry.findByCategory(category);
  }

  byMessage(message) {
    return this.registry.findByMessage(message);
  }

  all() {
    return this.registry.getAll();
  }
}

module.exports = { ProcessFinder };
