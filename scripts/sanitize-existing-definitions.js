#!/usr/bin/env node
const path = require('path');
const fs = require('fs').promises;
const yaml = require('js-yaml');

const { WilliMakoProcessSync } = require('../src/integrations/willi-mako-sync');

// Normalises all persisted YAML definitions using the same rules as the Willi Mako sync
// so legacy files stay schema-compliant after generator improvements.

async function sanitizeDirectory(sync, categoryDir) {
  const entries = await fs.readdir(categoryDir).catch(() => []);

  for (const name of entries) {
    if (!name.endsWith('.yaml')) {
      continue;
    }

    const sourcePath = path.join(categoryDir, name);
    const content = await fs.readFile(sourcePath, 'utf8');
    const definition = yaml.load(content) || {};

    const fallbackId = sync.extractPruefidentifikator(
      definition?.trigger?.pruefidentifikator ||
      definition?.process?.id ||
      path.parse(name).name.split('-')[0]
    );

    const sanitized = sync.sanitizeDefinition(definition, fallbackId);
    const yamlContent = yaml.dump(sanitized, { indent: 2, lineWidth: 120 });
    const targetName = `${sanitized.trigger.pruefidentifikator}-${sanitized.process.id}.yaml`;
    const targetPath = path.join(categoryDir, targetName);

    await fs.writeFile(targetPath, yamlContent, 'utf8');

    if (targetPath !== sourcePath) {
      await fs.rm(sourcePath).catch(() => undefined);
    }
  }
}

async function run() {
  const sync = new WilliMakoProcessSync(async () => null);
  const baseDir = path.resolve(__dirname, '..', 'definitions');
  const categories = ['gpke', 'wim', 'geli-gas'];

  for (const category of categories) {
    const categoryDir = path.join(baseDir, category);
    await sanitizeDirectory(sync, categoryDir);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
