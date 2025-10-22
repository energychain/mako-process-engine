const path = require('path');
const dotenv = require('dotenv');

class ConfigError extends Error {
  constructor(variable, hint) {
    super(`Environment variable ${variable} is required.`);
    this.name = 'ConfigError';
    this.variable = variable;
    this.hint = hint;
  }
}

const resolvedEnvPath = process.env.MAKO_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.MAKO_CONFIG_PATH)
  : path.resolve(process.cwd(), '.env');

const result = dotenv.config({ path: resolvedEnvPath });

if (result.error && result.error.code !== 'ENOENT') {
  console.warn(`Could not load environment file ${resolvedEnvPath}: ${result.error.message}`);
}

const getEnv = (name, defaultValue = undefined) => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
};

const getRequiredEnv = (name, hint) => {
  const value = getEnv(name);
  if (value === undefined || value === '') {
    throw new ConfigError(name, hint);
  }
  return value;
};

const describeConfigError = error => {
  if (!(error instanceof ConfigError)) return error.message;
  return `${error.message} Hint: ${error.hint}`;
};

module.exports = {
  ConfigError,
  getEnv,
  getRequiredEnv,
  describeConfigError,
  envPath: resolvedEnvPath
};
