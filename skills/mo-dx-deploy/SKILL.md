---
name: mo-dx-deploy
description: Saves a single Salesforce source file or bundle (Apex class, trigger, Visualforce page/component, Aura, LWC, static resource) to an org in seconds through the Tooling API using mo-dx-plugin's `sf deploy:*` commands. Use when the user wants a fast save/compile loop for one file or component, asks to "push", "save", or "quick deploy" a .cls, .trigger, .page, .component, aura, lwc, or staticresources path, or mentions mo-dx-plugin or DX Code Companion.
---

# mo-dx-deploy

Fast, single-component saves via the Tooling API. No source tracking and no
history: the org copy is overwritten. Use `sf project deploy start` instead
for multi-component deploys, destructive changes, or production Apex (that
needs test runs).

## Quick start

```sh
# Picks the right deploy:* command from the path and fails loud on errors
skills/mo-dx-deploy/scripts/mo-deploy.sh force-app/main/default/classes/MyClass.cls -o my-scratch
```

Or call a command directly:

```sh
sf deploy:apex -p force-app/main/default/classes/MyClass.cls -o my-scratch
```

## Rules

1. **Always pass `-o <org>`.** Without it the command silently targets the
   user's default org, which may be production. Before saving to a non-scratch
   org, confirm with the user.
2. **Check for failure.** A failed save prints a line ending in `✖` followed
   by `Line: … Column: … Error: …`. From mo-dx-plugin 2.0.0 it also exits 1.
   On 1.x it exits 0, so use `scripts/mo-deploy.sh` (it exits 1 on `✖` with
   any version) or scan the output for `✖`. Don't rely on `--json`: most
   `deploy:*` commands print nothing in JSON mode.
3. Run from inside an SFDX project (`sfdx-project.json`); every command requires one.
4. Use forward-slash paths that keep the type folder (`classes/`, `lwc/`,
   `aura/`, `staticresources/`). The commands derive names from the path.

## Which command

| Path | Command | Notes |
|---|---|---|
| `*.cls` | `deploy:apex` | Needs `<file>-meta.xml` beside it. |
| `*.trigger` | `deploy:trigger` | Needs `-meta.xml`. |
| `*.page` | `deploy:vf` | Needs `-meta.xml`. |
| `*.component` | `deploy:vfcomponent` | Needs `-meta.xml`. |
| `aura/<bundle>` or a file in it | `deploy:aura` | Directory = whole bundle. |
| `lwc/<bundle>` or a file in it | `deploy:lwc` | **New bundles: pass the directory.** |
| `staticresources/…` | `deploy:staticresource` | See below. |

Create vs update is automatic: output says `Created` or `Updated`.

## Gotchas

- **LWC:** a single-file deploy of a bundle that doesn't exist in the org yet
  fails (no `js-meta.xml`). Deploy the directory. Subfolders such as
  `__tests__` are skipped. If the bundle imports `@salesforce/schema/…`, the
  command automatically retries through the Metadata API (a few seconds slower).
  On failure it may have partially updated the bundle; fix and redeploy the
  whole directory.
- **Static resources:** a file directly in `staticresources/` (e.g.
  `app.js`) is saved as that file with a MIME type from its extension. A file
  *inside a folder* (`staticresources/spa/index.html`) zips and saves the whole
  folder as resource `spa`. `-c public|private` (default `private`) only
  applies when creating. Use `-r <folder>` if the folder isn't named
  `staticresources`. Single files are read as UTF-8, so don't use it for binary files.
- **Apex in production:** Tooling API saves are rejected in production orgs.
  Use a scratch org or sandbox.

Flag details and sample output: [REFERENCE.md](REFERENCE.md).
