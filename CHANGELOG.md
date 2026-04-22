# Changelog

## 1.0.0 (2026-04-22)

This is a major release that modernizes the entire plugin infrastructure. All 10 commands work identically to before -- no command names have changed. The `--targetusername` flag has been replaced by `--target-org` (with `-o` shorthand) to align with the modern Salesforce CLI convention.

### Breaking Changes

- **Node.js 20+ is now required.** The plugin no longer runs on Node 16 or 18. If you are on an older Node version, stay on 0.3.2 and upgrade Node before updating.
- **Salesforce CLI `sf` v2+ is required.** The legacy `sfdx` binary still works for running commands, but installation now uses `sf plugins install` instead of `sfdx plugins:install`.
- **`--targetusername` / `-u` flag replaced by `--target-org` / `-o`.** If you have scripts or the DX Code Companion extension using `-u`, update them to use `-o` or `--target-org`.

### What existing users need to know

- **Commands are unchanged.** `deploy:apex`, `deploy:trigger`, `deploy:vf`, `deploy:vfcomponent`, `deploy:aura`, `deploy:lwc`, `deploy:staticresource`, `retrieve:dxsource`, `retrieve:pkgsource`, and `metadata:rename` all accept the same flags and produce the same output.
- **Update your install command.** Run `sf plugins install mo-dx-plugin` to upgrade. The old `sfdx plugins:install mo-dx-plugin` may still work but is deprecated.
- **DX Code Companion extension.** The extension continues to work with this version without any changes.

### Migrated to ESM

The plugin is now a native ES Module, following the [Salesforce CLI ESM migration guide](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/maintain-migrate-esm.html).

- Added `"type": "module"` to package.json.
- All source files use ESM `import`/`export` syntax.
- All relative imports include `.js` extensions.
- `__dirname` replaced with `import.meta.url` pattern.
- `require()` calls replaced with ESM imports or `createRequire` where needed.
- `bin/run.js` and `bin/dev.js` follow the oclif ESM convention.
- TypeScript config extends `@salesforce/dev-config/tsconfig-strict-esm`.

### Dependency upgrades

Every dependency has been updated to its latest compatible version. Unused dependencies have been removed.

### Migrated to SfCommand (`@salesforce/sf-plugins-core`)

The plugin has been migrated from the deprecated `@salesforce/command` (SfdxCommand) to the modern `@salesforce/sf-plugins-core` (SfCommand) + `@salesforce/core@8`. This eliminates the `Deprecated config name: apiVersion` warning that users were seeing on every command run.

- All commands now extend `SfCommand` instead of `SfdxCommand`.
- Flags use `@oclif/core` v4 Flags API with `requiredOrgFlagWithDeprecations` for org targeting.
- UX uses `this.spinner.start()`/`this.spinner.stop()` instead of `this.ux.startSpinner()`/`this.ux.stopSpinner()`.
- Messages use `Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)` (core@8 API).
- Connection obtained via `flags['target-org'].getConnection()` instead of `this.org.getConnection()`.
- Display helpers refactored to use a simple `{ log() }` interface instead of the removed `UX` class.

**Production dependencies:**

| Package | 0.3.2 | 1.0.0 | Notes |
|---------|-------|-------|-------|
| `@salesforce/sf-plugins-core` | _(new)_ | 12.2.6 | Replaces `@salesforce/command` |
| `@salesforce/core` | _(transitive)_ | 8.28.3 | Now a direct dependency (was transitive via `@salesforce/command`) |
| `adm-zip` | 0.4.13 | 0.5.17 | Import style changed to ESM default |
| `chalk` | 4.1.0 | 4.1.2 | Import changed from namespace to default |
| `fs-extra` | 9.0.1 | 11.3.4 | Import changed to ESM default |
| `mime-types` | 2.1.24 | 2.1.35 | |
| `tslib` | 1.9.3 | 2.8.1 | |
| `xmldom-sfdx-encoding` | 0.1.29 | 0.1.30 | |

**Removed (unused):** `@oclif/command`, `@oclif/config`, `@oclif/errors`, `lodash`.

**Dev dependencies:**

| Package | 0.3.2 | 1.0.0 | Notes |
|---------|-------|-------|-------|
| `typescript` | 3 | 5.7+ | |
| `oclif` | _(was @oclif/dev-cli 1.x)_ | 4.23.0 | Replaces deprecated `@oclif/dev-cli` |
| `@oclif/plugin-help` | 2 | 6.2.38 | |
| `@oclif/test` | 1 | 4.1.18 | |
| `@salesforce/dev-config` | 2.0.0 | 4.3.3 | |
| `mocha` | 5 | 10.8.2 | |
| `sinon` | 5 | 11.1.2 | |
| `chai` | 4 | 4.5.0 | |
| `ts-node` | 9 | 10.9.2 | |
| `nyc` | 14 | 17.1.0 | |
| `globby` | 8 | 11.1.0 | |

**Removed:** `@types/jsforce`, `@types/lodash`, `tslint` (deprecated). **Added:** `@salesforce/ts-sinon`, `@types/sinon`.

### Security

All 34 npm audit vulnerabilities from the previous version have been resolved:

- Upgraded `oclif` from v3 to v4 (eliminated 27 vulnerabilities from yeoman-environment, aws-sdk v2, @octokit, tar, cacache, sigstore).
- Added `overrides` for `serialize-javascript@7.0.5` (fixes RCE/DoS in mocha's dependency chain).
- Added `overrides` for `tmp@0.2.5` (fixes symlink vulnerability in jsforce's dependency chain).
- `npm audit` now reports **0 vulnerabilities**.

### Tests

Tests have been rewritten following the [Salesforce CLI plugin testing guide](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/test-plugin.html).

- Replaced the old `@salesforce/command/lib/test` chain-based test with service-layer unit tests.
- 27 unit tests covering: `getFileName`, `delay`, `PackageXmlTemplate`, `executeToolingQuery`, `createMetadataContainer`, `createMetadataMember`, and `Deploy`.
- Uses mocha + chai + sinon with ESM-compatible mocking patterns (connection-level mocks instead of module-level sinon stubs).
- Mocha configured via `.mocharc.yml` with `ts-node/esm` loader.

### Other changes

- Removed deprecated `tslint.json` (tslint has been unmaintained since 2019).
- Removed `mocha.opts` in favor of `.mocharc.yml`.
- Engine requirement updated from Node 8 to Node 20.
- Source code uses `@salesforce/core` directly for `Connection` and `Messages` (previously accessed via `core` re-export from `@salesforce/command`).

## 0.3.2

- Previous stable release (CommonJS, Node 8+, sfdx CLI).
