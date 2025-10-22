const path = require('path');

const {
  ProcessDefinitionLoader,
  ProcessDefinition,
  ProcessRegistry,
  ValidationError
} = require('./core/loader');
const { TransformerProcessPlugin } = require('./integrations/transformer-plugin');
const { ProcessAwareRouter } = require('./integrations/router-plugin');
const {
  WilliMakoProcessSync,
  createWilliMakoProcessSync
} = require('./integrations/willi-mako-sync');
const {
  getEnv,
  getRequiredEnv,
  ConfigError,
  describeConfigError,
  envPath
} = require('./config/env');

module.exports = {
  ProcessDefinitionLoader,
  ProcessDefinition,
  ProcessRegistry,
  ValidationError,
  TransformerProcessPlugin,
  ProcessAwareRouter,
  WilliMakoProcessSync,
  createWilliMakoProcessSync,
  ConfigError,
  getEnv,
  getRequiredEnv,
  describeConfigError,
  envPath,
  definitionsPath: path.join(__dirname, '../definitions')
};
