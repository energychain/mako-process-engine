const fs = require('fs').promises;
const yaml = require('js-yaml');

const loadYamlFile = async filePath => {
  const content = await fs.readFile(filePath, 'utf8');
  return yaml.load(content);
};

module.exports = { loadYamlFile };
