# mo-dx-deploy reference

All commands also accept `-o, --target-org` (required unless a default org is
set), `--api-version`, `--json`, and `--flags-dir`.

| Command | Flags |
|---|---|
| `sf deploy:apex` | `-p, --filepath` (required) path to `.cls` |
| `sf deploy:trigger` | `-p, --filepath` (required) path to `.trigger` |
| `sf deploy:vf` | `-p, --filepath` (required) path to `.page` |
| `sf deploy:vfcomponent` | `-p, --filepath` (required) path to `.component` |
| `sf deploy:aura` | `-p, --filepath` (required) bundle dir or a file in it |
| `sf deploy:lwc` | `-p, --filepath` bundle dir (trailing `/` ok) or a file in it |
| `sf deploy:staticresource` | `-p, --filepath`; `-r, --resourcefolder` (default `staticresources`); `-c, --cachecontrol` (default `private`) |

## Output shapes

Success:

```
Saving... Apex Class Successfully Updated ✔.Command execution time: 2.6 seconds
```

Compile failure (exit code is still 0):

```
Saving... Apex Class Update Failed ✖
Line: 2  Column: 1  Error: Unexpected token '<EOF>'.
```

```
Saving... Failed ✖
lwc/myCmp/myCmp.js: [Line: 1, Col: 97] LWC1503: Parsing error: Unexpected token (1:97)
```

```
Saving... Aura Component Save Failed ✖
FIELD_INTEGRITY_EXCEPTION: No COMPONENT named markup://aura:nope found: Source
```

Local errors (missing file, bad flag, unknown org) exit 1 with `Error (…)`.

## Fix-and-retry loop

1. Run `scripts/mo-deploy.sh <path> -o <org>`.
2. On exit 1, read the `Line/Column/Error` lines and fix the source at that
   location.
3. Re-run. Stop after a few attempts if the same error repeats, and show it to the user.
