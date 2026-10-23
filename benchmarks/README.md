# Benchmarks: `sf deploy:*` vs `sf project deploy start`

How long a single-component save takes with mo-dx-plugin's Tooling API commands
compared with the standard `sf project deploy start --source-dir <same path>`,
and how much output each prints. Output size matters for coding agents because
everything a command prints ends up in the agent's context window.

Raw data: [`results/`](./results). Reproduce with
[`deploy-benchmark.mjs`](./deploy-benchmark.mjs) (see [Methodology](#methodology)).

## Summary

- **LWC, Aura and static resources are faster with mo-dx-plugin:** results
  arrive 0.8–2.1 s sooner (1.4–2.3×) and the process exits 1 s sooner in every
  scenario.
- **Apex classes, triggers, Visualforce pages and components are about even.**
  Results differ by less than 0.5 s in either direction and exit times are identical. Both tools
  compile through the same server-side Apex/VF compiler.
- **Output is 25–33× smaller than `sf project deploy start --json`**
  (80–98 bytes vs 2.5–2.8 KB per successful save) and 230–340× smaller than
  its default output, which reaches 22–28 KB when stdout is not a terminal, as
  in agent shells.
- **`sf project deploy start` reports compile errors sooner:** up to 0.6 s
  for Apex and 2.4–2.7 s for LWC. It also uses source tracking, deletes, multiple
  components and test runs, none of which mo-dx-plugin does.
- **Project size only slows down `sf project deploy start`.** With 2,000 extra
  local Apex classes it took 0.1–0.4 s longer per save. mo-dx-plugin showed no
  consistent change (−0.25 to +0.17 s, within noise), because it reads only
  the path you pass.

## Results

Medians of 7 timed rounds per component type, after one warm-up round that
creates the components. Per-sample values and min/max are in the JSON files.

- **Time to result** is when the final output line appeared, i.e. when the
  save was finished.
- **Time to exit** is when the process ended. This is what a script or an
  agent's tool call actually waits for. The `sf` CLI process stays alive for
  up to ~1 s after printing (it exits in ~1 s steps for every command, even
  `sf data query`), so exit times land on whole-second-plus-0.5 values for
  both tools.

### Tracked scratch org, small project

| Type | Time to result: mo-dx / sf | Time to exit: mo-dx / sf | Output bytes: mo-dx / sf / sf `--json` |
|---|---|---|---|
| Apex class | 3.44 s / 3.52 s | 4.52 s / 4.53 s | 83 / 27,949 / 2,488 |
| Apex trigger | 3.57 s / 3.62 s | 4.53 s / 4.53 s | 80 / 28,493 / 2,509 |
| Visualforce page | 3.33 s / 3.54 s | 4.52 s / 4.53 s | 88 / 27,473 / 2,482 |
| Visualforce component | 3.45 s / 3.52 s | 4.53 s / 4.53 s | 95 / 26,146 / 2,527 |
| Aura bundle | **2.54 s** / 3.59 s | **3.52 s** / 4.53 s | 84 / 27,862 / 2,767 |
| LWC bundle | **2.51 s** / 3.50 s | **3.53 s** / 4.54 s | 98 / 27,758 / 2,758 |
| Static resource | **1.91 s** / 3.50 s | **2.53 s** / 4.54 s | 88 / 28,237 / 2,530 |

### Tracked scratch org, project with 2,000 extra local Apex classes

The extra classes are local-only and never deployed. They stand in for a large repo.

| Type | Time to result: mo-dx / sf | Time to exit: mo-dx / sf |
|---|---|---|
| Apex class | 3.58 s / 3.88 s | 4.52 s / 4.53 s |
| Apex trigger | 3.62 s / 3.76 s | 4.52 s / 4.52 s |
| Visualforce page | 3.50 s / 3.92 s | 4.53 s / 4.54 s |
| Visualforce component | 3.46 s / 3.75 s | 4.54 s / 4.54 s |
| Aura bundle | **2.48 s** / 3.95 s | **3.53 s** / 4.54 s |
| LWC bundle | **2.47 s** / 3.85 s | **3.53 s** / 4.54 s |
| Static resource | **1.66 s** / 3.79 s | **2.52 s** / 4.54 s |

### Scratch org without source tracking (`--no-track-source`), small project

This is closest to working against a sandbox or Developer Edition org with tracking off.

| Type | Time to result: mo-dx / sf | Time to exit: mo-dx / sf |
|---|---|---|
| Apex class | 3.07 s / **2.89 s** | 3.52 s / 3.52 s |
| Apex trigger | 3.10 s / **2.93 s** | 3.51 s / 3.54 s |
| Visualforce page | 2.90 s / 2.91 s | 3.52 s / 3.53 s |
| Visualforce component | 2.98 s / **2.72 s** | 3.52 s / 3.53 s |
| Aura bundle | **2.11 s** / 2.97 s | **2.53 s** / 3.53 s |
| LWC bundle | **2.21 s** / 3.00 s | **2.53 s** / 3.54 s |
| Static resource | **1.70 s** / 3.18 s | **2.53 s** / 3.53 s |

### Compile errors (tracked scratch org, small project, median of 5)

| Type | Time to result: mo-dx / sf | Output bytes: mo-dx / sf / sf `--json` | Exit code: mo-dx (measured on 1.2.0) / sf |
|---|---|---|---|
| Apex class | 3.73 s / **3.15 s** | 144 / 22,006 / 2,968 | 0 / 1 |
| LWC bundle | 5.71 s / **3.19 s** | 251 / 22,460 / 2,928 | 0 / 1 |

These runs used 1.2.0, which exits 0 on compile errors. From 2.0.0
([#472](https://github.com/msrivastav13/mo-dx-plugin/pull/472)) it exits 1. The
change only affects the exit code, not timing or output.

What each tool prints for the Apex error:

```text
# mo-dx-plugin (144 bytes)
Saving... Apex Class Update Failed ✖
Line: 2  Column: 1  Error: Unexpected token '<EOF>'.
Line: 2  Column: 1  Error: Unexpected token '<EOF>'.
```

```text
# sf project deploy start, final frame only (22 KB in total, because every
# progress frame is printed when stdout is not a terminal)
Component Failures [1]
┌───────────┬─────────────┬─────────────────────────────────┬─────────────┐
│ Type      │ Name        │ Problem                         │ Line:Column │
├───────────┼─────────────┼─────────────────────────────────┼─────────────┤
│ ApexClass │ BenchApexSf │ Unexpected token '<EOF>'. (2:1) │ 2:1         │
└───────────┴─────────────┴─────────────────────────────────┴─────────────┘
```

`--json` output (2.9 KB) has the same facts inside `result.details.componentFailures`,
next to deploy metadata, `componentSuccesses`, and an empty `runTestResult`.

## Why this matters for agents

An agent fixing a component works in a loop: edit, save, read the result,
repeat. Each round adds the command's output to the agent's context and waits
for the process to exit.

**1. Context cost per save.** Using the measured medians and a rough rule of
thumb of ~4 bytes per token (JSON and box-drawing characters usually cost more):

| 20 saves of one component | Output | ≈ Tokens |
|---|---|---|
| mo-dx-plugin | ~1.8 KB | ~450 |
| `sf project deploy start --json` | ~51 KB | ~13,000 |
| `sf project deploy start` (default, non-TTY) | ~555 KB | ~139,000 |

The default output of `sf project deploy start` is a progress display meant
for a terminal. In an agent's shell every frame gets printed, so 20 saves
would fill a large share of a 200K-token context window with progress
spinners. `--json` fixes most of that, but it's still ~30× more than the agent
needs to decide what to do next. mo-dx-plugin's output is a line saying
"saved" or "failed", plus `Line/Column/Error` for each problem. That's exactly
what the next edit needs.

**2. Wall-clock per round.** For LWC, Aura, and static resources, each round
finishes about 1 s sooner, because the Tooling API updates the resource in
place. There's no deploy packaging, no Metadata API deploy queue, and no
source-tracking update. That's ~20 s saved over a 20-save session. For Apex
and Visualforce there's no time difference.

**3. Cost that doesn't grow with the repo.** mo-dx-plugin reads only the path
it's given. `sf project deploy start` got 0.1–0.4 s slower per save with
2,000 extra local classes. In a large monorepo the gap widens.

**4. Narrow blast radius.** Each `deploy:*` call touches exactly one component,
which makes an agent's change easy to reason about and review.

### When an agent should *not* use mo-dx-plugin

- **Multiple components, deletions, or anything needing tests (e.g. Apex in
  production).** Use `sf project deploy start`.
- **When you need the fastest compile-error feedback.** `sf project deploy
  start` reported errors up to 2.7 s sooner in these runs.
- **When source tracking matters.** mo-dx-plugin saves bypass source tracking,
  so the org records them as remote changes. A later
  `sf project deploy start` on the same components stops with a conflict
  (observed while building this benchmark, which is why each tool uses its
  own components here). After an inner loop with mo-dx-plugin, finish with
  `sf project deploy start --ignore-conflicts` for the components you
  changed, or `sf project retrieve start` to resync.
- **mo-dx-plugin 1.x:** failures exit 0, so check the output for `✖`, or
  use the [`mo-deploy.sh`](../skills/mo-dx-deploy/scripts/mo-deploy.sh)
  wrapper from the agent skill. 2.0.0 exits 1 on failure.

A reasonable agent workflow: iterate on one component with `deploy:*` against
a scratch org or sandbox, then run one `sf project deploy start` for the
finished change set.

## Methodology

- **Environment:** Salesforce CLI `@salesforce/cli/2.155.7`, Node 22.22.3,
  macOS (Apple silicon). Fresh Developer-edition scratch orgs on API v67/68,
  October 2026. mo-dx-plugin built from `master` (1.2.0) and linked with
  `sf plugins link` into an isolated `XDG_DATA_HOME`, so no other user plugins
  were loaded.
- **Same work for both tools:** each tool deploys its own copy of every component
  (`…Mo` / `…Sf`), so neither trips source-tracking conflicts on the other.
  The component body changes on every run so each save really compiles.
  Run order alternates between tools each round to cancel out drift.
- **Commands:** `sf deploy:<type> -p <path> -o <org>` vs
  `sf project deploy start --source-dir <path> -o <org>` (default flags).
  Aura and LWC deploy the bundle directory. The others deploy the source file.
- **Output size:** stdout+stderr with all ANSI escape sequences removed (so
  `sf` numbers are conservative), and with the "linked ESM module" notice
  removed, since it only appears for linked checkouts.
- **Limits:** one machine, one network location, one org edition. Absolute
  times vary with network latency and org load. Compare tools within a table,
  not across tables. The ~1 s exit cadence of the `sf` CLI applies to both tools.

Reproduce (needs an SFDX project and an authenticated org):

```sh
node benchmarks/deploy-benchmark.mjs --target-org <alias> --project <sfdx-project-dir> \
  --runs 7 --scenario tracked-small --out benchmarks/results/tracked-small.json
# large-repo scenario
node benchmarks/deploy-benchmark.mjs --target-org <alias> --project <sfdx-project-dir> \
  --runs 7 --padding 2000 --scenario tracked-large --out benchmarks/results/tracked-large.json
```

The script creates `Bench*` components in the target org. Use a scratch org.
