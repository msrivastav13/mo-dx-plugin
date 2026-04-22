# mo-dx-plugin

A plugin for Salesforce CLI (`sf`) that provides the ability to save Apex Classes, Apex Triggers, Visualforce Pages, Visualforce Components, Aura Bundles (Lightning Components), Lightning Web Components, and Static Resources to any Salesforce org (scratch or non-scratch) using the Tooling API.

The plugin also provides retrieve commands that can pull metadata in Salesforce DX or traditional source format from unmanaged/managed packages or changesets.

These commands are used within the [DX Code Companion](https://marketplace.visualstudio.com/items?itemName=MohithShrivastava.dx-code-companion) VS Code extension. If you use VS Code, installing the extension alongside this plugin is recommended.

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
  $ sf metadata:rename -t <type> -o <oldname> -n <newname> [-u <username>] [--json]

OPTIONS
  -t, --metadatatype    (required) Metadata type (e.g. CustomObject, CustomField)
  -o, --oldfullname     (required) Current API name of the component
  -n, --newfullname     (required) New API name for the component
  -u, --targetusername  Username or alias for the target org

EXAMPLES
  $ sf metadata:rename -t CustomObject -o MyObject__c -n RenamedObject__c
```

---

## Important Note

These commands do not maintain history. Files are overwritten on the server. Make sure you have source control set up for your project so you can recover code if needed.

## Development

```sh
npm install
npm run prepack     # compile TypeScript + generate oclif manifest
npm test            # run unit tests (mocha + chai + sinon)
./bin/dev.js        # run commands from source (auto-transpiles)
```

## License

MIT
