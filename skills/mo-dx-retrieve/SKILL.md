---
name: mo-dx-retrieve
description: Pulls every component of an unmanaged/managed package or an outbound change set from a Salesforce org into a local SFDX project, either as Salesforce DX source (`sf retrieve:dxsource`) or Metadata API format (`sf retrieve:pkgsource`), using mo-dx-plugin. Use when the user wants to download, pull, or convert a package or change set by name, migrate a change set into source control, or mentions retrieve:dxsource / retrieve:pkgsource.
---

# mo-dx-retrieve

Retrieves a named package or change set. Pick the output format:

| Want | Command | Writes |
|---|---|---|
| DX source (`force-app/…`) | `sf retrieve:dxsource -n "<name>"` | `<pathname>/` + `manifest/package.xml` |
| Metadata API format | `sf retrieve:pkgsource -n "<name>"` | `<retrievedir>/` (default `src/`) with `package.xml` |

## Quick start

```sh
# Change set → DX source in force-app, package.xml in manifest/
sf retrieve:dxsource -n "Release 42 Changes" -o my-sandbox

# Package → mdapi format in changesets/src
sf retrieve:pkgsource -n "My Package" -r changesets/src -o my-sandbox
```

## Workflow

1. Get the exact package/change set name (case- and space-sensitive). Quote it.
2. Always pass `-o <org>`. It's read-only against the org, but the default
   org may not be the one the user means.
3. Run from inside an SFDX project. `dxsource` also needs the standard `sf`
   CLI plugins (`project convert mdapi` runs in-process).
4. Check the exit code. These commands exit 1 on failure. A wrong name gives
   `INVALID_CROSS_REFERENCE_KEY: No package named '<name>' found`. List the
   change sets or packages in Setup and retry with the exact name.
5. Lines printed as warnings are components the org couldn't include. Report them.

## Local side effects (warn the user first)

- `dxsource` **deletes and recreates `./manifest/`** and overwrites matching
  files under `--pathname` (default `force-app`). Commit or stash first.
- `dxsource` stages the raw retrieve in `./mdapiout/` and deletes it afterwards.
  Pass `-m true` to keep it.
- `pkgsource` overwrites files in `--retrievedir`.
- Retrieves time out after 30 minutes.

## Flags

| Command | Flag | Meaning |
|---|---|---|
| both | `-n, --packagename` (required) | package or change set name |
| both | `-o, --target-org` | org username/alias |
| `dxsource` | `-p, --pathname` | DX output dir, default `force-app` |
| `dxsource` | `-m, --retainmetadata` | any value keeps `mdapiout/` |
| `pkgsource` | `-r, --retrievedir` | output dir, default `src` |

Requires mo-dx-plugin 2.0.0 or newer. Older versions shell out to the removed
`sfdx force:mdapi:retrieve` and fail. Upgrade with `sf plugins install mo-dx-plugin@latest`.
