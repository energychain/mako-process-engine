# Release Playbook

Follow these steps to prepare and publish a new version of `mako-process-definitions`.

## 1. Pre-flight checks

1. Update `CHANGELOG.md` with the upcoming version and date.
2. Run `npm install` to ensure lockfile consistency (if using a lockfile).
3. Execute the full validation suite:
   - `npm run lint`
   - `npm test`
   - `npm run definitions:validate`
4. Verify that `.env` is not committed and documentation references are current.

## 2. Definition sync (optional)

If the release contains new knowledge from Willi Mako:

1. Ensure `WILLI_MAKO_TOKEN` is set in `.env`.
2. Run `npm run definitions:generate`.
3. Review generated YAML changes and update documentation/examples accordingly.
4. Re-run validation commands.

## 3. Versioning

1. Bump the version in `package.json` following Semantic Versioning.
2. Update the corresponding entry in `CHANGELOG.md`.
3. Commit with `chore(release): vX.Y.Z`.

## 4. Publish

1. Push changes and create a GitHub tag `vX.Y.Z`.
2. (Optional) Draft a GitHub Release summarising highlights and linking to documentation.
3. Publish to npm:

   ```bash
   npm publish --access public
   ```

## 5. Post-release

1. Monitor GitHub issues for feedback.
2. Update roadmap or project board with next milestones.
3. Announce updates internally and, if relevant, in community channels.
