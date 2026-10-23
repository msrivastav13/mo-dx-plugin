---
name: mo-dx-rename
description: Renames a metadata component directly in a Salesforce org (e.g. a custom object, custom field, layout, or other renameable type) through the Metadata API using mo-dx-plugin's `sf metadata:rename`. Use when the user wants to rename an object, field, or other metadata in an org in place, change a component's API name, or mentions metadata:rename.
---

# mo-dx-rename

Calls Metadata API `renameMetadata` against the org. It changes the org only;
local source files are **not** renamed.

## Quick start

```sh
sf metadata:rename -t CustomObject -d Invoice__c -n Bill__c -o my-scratch
```

| Flag | Meaning |
|---|---|
| `-t, --metadatatype` (required) | Metadata API type, e.g. `CustomObject`, `CustomField`, `Layout` |
| `-d, --oldfullname` (required) | current full name |
| `-n, --newfullname` (required) | new full name |
| `-o, --target-org` | org username/alias |

`-d` is the old name (not `-o`, which since 1.2.0 is the target org).

## Workflow

1. **Confirm with the user before running.** A rename is a live, in-place
   change. Code, formulas, and integrations that reference the old API name by
   string can break. Prefer a scratch org or sandbox first.
2. Always pass `-o <org>`. Without it the command targets the default org.
3. Use full names as the Metadata API expects them. Fields are
   `Object__c.Field__c`, layouts `Object__c-Layout Name`. Quote names with spaces.
4. **Check the result.** From mo-dx-plugin 2.0.0 a failed rename exits 1. On
   1.x it exits 0, so read the output.
   - Success: `CustomObject Invoice__c is successfully Renamed to Bill__c ✔`
   - Failure: `ERROR--sf:INVALID_CROSS_REFERENCE_KEY: … no CustomObject named Invoice__c found`
5. Afterwards, update local source to match (rename files/folders and
   references), or re-retrieve the component, so the next deploy doesn't
   recreate the old name.

Not every type supports rename. Apex classes, for example, return
`INVALID_TYPE: This type of metadata is not available for this organization`.
In that case fall back to create-new + migrate + delete-old with the user's approval.
