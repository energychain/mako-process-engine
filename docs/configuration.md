# Configuration

This project loads environment variables from a `.env` file using [dotenv](https://www.npmjs.com/package/dotenv). The loader runs automatically when you import any module from `mako-process-definitions`.

## Required variables

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `WILLI_MAKO_TOKEN` | Personal access token from the Willi Mako portal. Required for `npm run definitions:generate`. Obtain it via `willi-mako auth login -e <email> -p <password>`. | `WILLI_MAKO_TOKEN=abc123` |

## Optional variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `MAKO_CONFIG_PATH` | Custom path to the `.env` file that should be loaded. | `.env` in project root |

Copy `.env.example` to `.env` and adjust the values before running scripts.

## Error handling

If a required variable is missing, the code throws a `ConfigError` with a clear hint. Command line scripts catch this error and print actionable guidance along with the path of the environment file that was evaluated.
