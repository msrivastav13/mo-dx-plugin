# mo-dx-plugin

A plugin for Salesforce CLI (`sf`) that provides the ability to save Apex Classes, Apex Triggers, Visualforce Pages, Visualforce Components, Aura Bundles (Lightning Components), Lightning Web Components, and Static Resources to any Salesforce org (scratch or non-scratch) using the Tooling API.

The plugin also provides retrieve commands that can pull metadata in Salesforce DX or traditional source format from unmanaged/managed packages or changesets.

These commands are used within the [DX Code Companion](https://marketplace.visualstudio.com/items?itemName=MohithShrivastava.dx-code-companion) VS Code extension. If you use VS Code, installing the extension alongside this plugin is recommended.

## mo-dx-plugin vs `sf project deploy start`

mo-dx-plugin is built for the **inner loop**: save one file, see whether it compiled, fix, repeat. `sf project deploy start` is built for **shipping a set of changes**. They complement each other. The numbers below come from [benchmarks](./benchmarks/README.md) against real scratch orgs (median of 7 runs per component type).

| | `sf deploy:*` (mo-dx-plugin) | `sf project deploy start` |
|---|---|---|
| Scope | One file or bundle per call | Any number of components, deletes, manifests |
| API | Tooling API (in-place save) | Metadata API (packaged deploy) |
| LWC / Aura / static resource save | **1.4–2.3× faster**, exits ~1 s sooner | Baseline |
| Apex / trigger / Visualforce save | About the same | About the same |
| Output per successful save | **80–98 bytes** | 2.5–2.8 KB (`--json`), 22–28 KB (default, non-terminal) |
| Compile-error feedback | Slower (up to 0.6 s Apex, ~2.5 s LWC) | **Faster** |
| Source tracking | Bypassed | Maintained |
| Test runs / production Apex | Not supported | Supported |

### Advantages

- **Faster saves for LWC, Aura and static resources.** These save 0.8–2.1 s faster per save (1.4–2.3×), because the Tooling API updates the resource in place. There's no packaging, no deploy queue, and no source-tracking update.
- **Speed doesn't depend on project size.** Only the path you pass is read. With 2,000 extra local Apex classes in the project, `sf project deploy start` got 0.1–0.4 s slower per save, and mo-dx-plugin didn't change.
- **Compact output.** A save prints one line, plus `Line / Column / Error` for each problem. That's 25–33× less than `sf project deploy start --json` and 230–340× less than its default output in a non-terminal shell. For coding agents, 20 saves cost about 450 tokens of context instead of about 13K (`--json`) or about 139K (default).
- **Small blast radius.** Each call touches exactly one component, so it's obvious what changed in the org.
- **No setup.** No manifest or `package.xml` is needed. Create vs update is detected automatically, and it works against any org, including sandboxes and orgs without source tracking.

### Limitations

- **One component at a time.** No multi-component deploys, no destructive changes, no test runs. Tooling API saves are rejected for Apex in production orgs. Use `sf project deploy start` for those.
- **No time saving for Apex or Visualforce.** Both tools wait on the same server-side compiler.
- **Slower compile-error feedback.** In the benchmarks `sf project deploy start` reported errors sooner: up to 0.6 s for Apex and about 2.5 s for LWC.
- **Bypasses source tracking.** The org records mo-dx-plugin saves as remote changes, so a later `sf project deploy start` on the same components stops with a conflict. Finish with `sf project deploy start --ignore-conflicts`, or resync with `sf project retrieve start`.
- **No history.** The org copy is overwritten (see [Tracking changes against your org](#tracking-changes-against-your-org)).
- **LWC bundle updates aren't atomic.** If one resource in a bundle fails, the others may already be saved. Fix the error and re-deploy the whole bundle directory.
- **Failed saves exit 0 in 1.2.0.** Check the output for `✖`, or use the agent skill's [`mo-deploy.sh`](./skills/mo-dx-deploy/scripts/mo-deploy.sh) wrapper. A fix is in [#472](https://github.com/msrivastav13/mo-dx-plugin/pull/472).
- **`--json` output is empty** for `deploy:trigger`, `deploy:vf`, `deploy:vfcomponent`, `deploy:aura` and `deploy:lwc`. Read the regular output instead.
- **Single-file static resources are read as UTF-8**, so binary files (images, fonts) can be corrupted. Put them in a folder-based (zipped) resource, or deploy them with `sf project deploy start`.

### Recommended workflow

1. Iterate on a component with `sf deploy:<type> -p <path> -o <scratch-or-sandbox>` until it compiles and behaves.
2. When the change is done, run a single `sf project deploy start` (add `--ignore-conflicts` for components you saved with mo-dx-plugin). This syncs source tracking and deploys anything else in the change.
3. Use `sf project deploy start` for production, deletes, and anything that needs tests.

## Requirements

- **Node.js >= 20**
- **Salesforce CLI (`sf`) v2+**

## Installation

### Install as plugin (recommended)

```sh
sf plugins install mo-dx-plugin
```

### Install from source

```sh
git clone git@github.com:msrivastav13/mo-dx-plugin.git
cd mo-dx-plugin
npm install
npm run prepack
sf plugins link .
```

> **Note:** This is an ESM plugin. After any source changes you must run `npm run prepack` (or `tsc`) before using it via `sf plugins link`. During active development you can use `./bin/dev.js` which auto-transpiles.

## Upgrading from 0.x

See [CHANGELOG.md](./CHANGELOG.md) for full details. The key changes for existing users:

- **Node.js 20+ is now required.** Versions below 20 are no longer supported.
- **Use `sf` instead of `sfdx`.** All commands still work the same way, but the CLI binary is `sf`. Example: `sf deploy:apex -p <path>`.
- **Install command changed.** Use `sf plugins install` instead of `sfdx plugins:install`.
- **`--targetusername` / `-u` is now `--target-org` / `-o`.** Update any scripts or extensions that pass the old flag name.
- **All 10 commands work identically otherwise.** Same command names, same output.

## Commands

- [mo-dx-plugin](#mo-dx-plugin)
  - [mo-dx-plugin vs `sf project deploy start`](#mo-dx-plugin-vs-sf-project-deploy-start)
    - [Advantages](#advantages)
    - [Limitations](#limitations)
    - [Recommended workflow](#recommended-workflow)
  - [Requirements](#requirements)
  - [Installation](#installation)
    - [Install as plugin (recommended)](#install-as-plugin-recommended)
    - [Install from source](#install-from-source)
  - [Upgrading from 0.x](#upgrading-from-0x)
  - [Commands](#commands)
    - [`sf deploy:apex`](#sf-deployapex)
    - [`sf deploy:trigger`](#sf-deploytrigger)
    - [`sf deploy:vf`](#sf-deployvf)
    - [`sf deploy:vfcomponent`](#sf-deployvfcomponent)
    - [`sf deploy:aura`](#sf-deployaura)
    - [`sf deploy:lwc`](#sf-deploylwc)
    - [`sf deploy:staticresource`](#sf-deploystaticresource)
    - [`sf retrieve:dxsource`](#sf-retrievedxsource)
    - [`sf retrieve:pkgsource`](#sf-retrievepkgsource)
    - [`sf metadata:rename`](#sf-metadatarename)
  - [Important Notes](#important-notes)
    - [Tracking changes against your org](#tracking-changes-against-your-org)
    - [Performance](#performance)
    - [Metadata API Fallback](#metadata-api-fallback)
  - [Development](#development)
  - [License](#license)

---

### `sf deploy:apex`

Deploy an Apex class to a Salesforce org using the Tooling API. Creates the class if it does not exist; updates it if it does.

```
USAGE
  $ sf deploy:apex -p <filepath> [-u <username>] [--json]

OPTIONS
  -p, --filepath    (required) Path to the .cls file
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf deploy:apex -p force-app/main/default/classes/MyClass.cls
```

### `sf deploy:trigger`

Deploy an Apex trigger using the Tooling API.

```
USAGE
  $ sf deploy:trigger -p <filepath> [-u <username>] [--json]

OPTIONS
  -p, --filepath    (required) Path to the .trigger file
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf deploy:trigger -p force-app/main/default/triggers/AccountTrigger.trigger
```

### `sf deploy:vf`

Deploy a Visualforce page using the Tooling API.

```
USAGE
  $ sf deploy:vf -p <filepath> [-u <username>] [--json]

OPTIONS
  -p, --filepath    (required) Path to the .page file
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf deploy:vf -p force-app/main/default/pages/MyPage.page
```

### `sf deploy:vfcomponent`

Deploy a Visualforce component using the Tooling API.

```
USAGE
  $ sf deploy:vfcomponent -p <filepath> [-u <username>] [--json]

OPTIONS
  -p, --filepath    (required) Path to the .component file
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf deploy:vfcomponent -p force-app/main/default/components/MyComp.component
```

### `sf deploy:aura`

Deploy an Aura lightning bundle using the Tooling API. Supports deploying an entire bundle (pass the directory path) or individual files within a bundle.

```
USAGE
  $ sf deploy:aura -p <filepath> [-u <username>] [--json]

OPTIONS
  -p, --filepath    (required) Path to the aura bundle directory or a file within it
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf deploy:aura -p force-app/main/default/aura/MyComponent
  $ sf deploy:aura -p force-app/main/default/aura/MyComponent/MyComponentController.js
```

### `sf deploy:lwc`

Deploy a Lightning Web Component bundle using the Tooling API. Supports deploying an entire bundle or individual files.

```
USAGE
  $ sf deploy:lwc -p <filepath> [-u <username>] [--json]

OPTIONS
  -p, --filepath    (required) Path to the LWC bundle directory or a file within it
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf deploy:lwc -p force-app/main/default/lwc/myComponent
  $ sf deploy:lwc -p force-app/main/default/lwc/myComponent/myComponent.js
```

### `sf deploy:staticresource`

Deploy a static resource using the Tooling API. Supports individual files and bundled folders (automatically zipped).

```
USAGE
  $ sf deploy:staticresource -p <filepath> [-u <username>] [-r <folder>] [-c <cachecontrol>] [--json]

OPTIONS
  -p, --filepath        (required) Path to the static resource file or folder
  -r, --resourcefolder  [default: staticresources] Folder name containing static resources
  -c, --cachecontrol    [default: private] Cache control setting (private or public)
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf deploy:staticresource -p force-app/main/default/staticresources/myApp
  $ sf deploy:staticresource -p force-app/main/default/staticresources/style.css --cachecontrol public
```

### `sf retrieve:dxsource`

Retrieve metadata from an unmanaged/managed package or changeset and convert it to Salesforce DX source format.

```
USAGE
  $ sf retrieve:dxsource -n <name> [-u <username>] [-p <path>] [-m <string>] [--json]

OPTIONS
  -n, --packagename     (required) Name of the package or changeset to retrieve
  -p, --pathname        [default: force-app] Output directory for DX conversion
  -m, --retainmetadata  If set, retains the raw mdapi output in the mdapiout directory
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf retrieve:dxsource -n "My Package"
  $ sf retrieve:dxsource -u myOrg@example.com -n "My Changeset" -p src
```

### `sf retrieve:pkgsource`

Retrieve metadata from an unmanaged/managed package or changeset in traditional Metadata API format.

```
USAGE
  $ sf retrieve:pkgsource -n <name> [-u <username>] [-r <dir>] [--json]

OPTIONS
  -n, --packagename     (required) Name of the package or changeset to retrieve
  -r, --retrievedir     Directory to retrieve into (defaults to src)
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf retrieve:pkgsource -n "My Package"
  $ sf retrieve:pkgsource -n "My Package" -r changesets/src
```

### `sf metadata:rename`

Rename a metadata component using the Metadata API.

```
USAGE
  $ sf metadata:rename -t <type> -d <oldname> -n <newname> [-o <username>] [--json]

OPTIONS
  -t, --metadatatype  (required) Metadata type (e.g. CustomObject, CustomField)
  -d, --oldfullname   (required) Current API name of the component
  -n, --newfullname   (required) New API name for the component
  -o, --target-org    Username or alias for the target org; defaults to the configured default org

EXAMPLES
  $ sf metadata:rename -t CustomObject -d MyObject__c -n RenamedObject__c
```

---

## Important Notes

### Tracking changes against your org

These commands do not maintain history. Files are overwritten on the server. Make sure you have source control set up for your project so you can recover code if needed.


### Performance

See [mo-dx-plugin vs `sf project deploy start`](#mo-dx-plugin-vs-sf-project-deploy-start) for the summary, and [benchmarks/](./benchmarks/README.md) for the full numbers and methodology.

### Metadata API Fallback

 When the Tooling API rejects a save because the bundle imports a custom field via `@salesforce/schema/` (a Tooling API Salesforce bug, see [#434](https://github.com/msrivastav13/mo-dx-plugin/issues/434)), `deploy:lwc` automatically retries through the Metadata API. This applies whether you are creating a new bundle or updating an existing one. The save takes a few seconds longer and will surface success or errors from the Metadata API.

## Development

```sh
npm install
npm run prepack     # compile TypeScript + generate oclif manifest
npm test            # run unit tests (mocha + chai + sinon)
./bin/dev.js        # run commands from source (auto-transpiles)
```

## License

MIT
