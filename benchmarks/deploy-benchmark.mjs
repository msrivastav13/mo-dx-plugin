#!/usr/bin/env node
// Benchmarks mo-dx-plugin `sf deploy:*` against `sf project deploy start --source-dir`
// for the same component types, on the same org and project.
//
// Each tool gets its own copy of every component (…Mo / …Sf) so the two never
// trip source-tracking conflicts on each other, and the run order alternates
// between tools to cancel out drift. The first round creates the components
// and is discarded as warm-up.
//
// Usage:
//   node benchmarks/deploy-benchmark.mjs --target-org <alias> --project <sfdx project dir>
//     [--runs 7] [--padding 0] [--scenario <label>] [--out <results.json>]
//
// --padding N writes N extra local-only Apex classes into the project to mimic a
// large repo. They are never deployed; they only affect work that scans the project.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, [])
);
const targetOrg = args['target-org'];
const project = args.project && path.resolve(args.project);
const runs = Number(args.runs ?? 7);
const padding = Number(args.padding ?? 0);
const scenario = args.scenario ?? 'default';
if (!targetOrg || !project) {
  console.error('Usage: deploy-benchmark.mjs --target-org <alias> --project <dir> [--runs 7] [--padding 0] [--scenario label] [--out file]');
  process.exit(2);
}

const API = '62.0';
const root = path.join(project, 'force-app', 'main', 'default');
const xml = (type, body) => `<?xml version="1.0" encoding="UTF-8"?>\n<${type} xmlns="http://soap.sforce.com/2006/04/metadata">${body}</${type}>\n`;

// Each fixture: files(name, n) -> { relativePath: content }, plus the path both tools deploy.
const FIXTURES = [
  {
    type: 'Apex class', cmd: 'apex', name: s => `BenchApex${s}`,
    files: (name, n, broken) => ({
      [`classes/${name}.cls`]: broken ? `public class ${name} { broken` : `public class ${name} { public static Integer v() { return ${n}; } }`,
      [`classes/${name}.cls-meta.xml`]: xml('ApexClass', `<apiVersion>${API}</apiVersion><status>Active</status>`)
    }),
    target: name => `classes/${name}.cls`
  },
  {
    type: 'Apex trigger', cmd: 'trigger', name: s => `BenchTrig${s}`,
    files: (name, n) => ({
      [`triggers/${name}.trigger`]: `trigger ${name} on Account (before insert) { Integer v = ${n}; }`,
      [`triggers/${name}.trigger-meta.xml`]: xml('ApexTrigger', `<apiVersion>${API}</apiVersion><status>Active</status>`)
    }),
    target: name => `triggers/${name}.trigger`
  },
  {
    type: 'Visualforce page', cmd: 'vf', name: s => `BenchPage${s}`,
    files: (name, n) => ({
      [`pages/${name}.page`]: `<apex:page>${n}</apex:page>`,
      [`pages/${name}.page-meta.xml`]: xml('ApexPage', `<apiVersion>${API}</apiVersion><label>${name}</label>`)
    }),
    target: name => `pages/${name}.page`
  },
  {
    type: 'Visualforce component', cmd: 'vfcomponent', name: s => `BenchComp${s}`,
    files: (name, n) => ({
      [`components/${name}.component`]: `<apex:component>${n}</apex:component>`,
      [`components/${name}.component-meta.xml`]: xml('ApexComponent', `<apiVersion>${API}</apiVersion><label>${name}</label>`)
    }),
    target: name => `components/${name}.component`
  },
  {
    type: 'Aura bundle', cmd: 'aura', name: s => `benchAura${s}`,
    files: (name, n) => ({
      [`aura/${name}/${name}.cmp`]: `<aura:component>${n}</aura:component>`,
      [`aura/${name}/${name}Controller.js`]: `({ init: function () { return ${n}; } })`,
      [`aura/${name}/${name}.cmp-meta.xml`]: xml('AuraDefinitionBundle', `<apiVersion>${API}</apiVersion><description>bench</description>`)
    }),
    target: name => `aura/${name}`
  },
  {
    type: 'LWC bundle', cmd: 'lwc', name: s => `benchLwc${s}`,
    files: (name, n, broken) => ({
      [`lwc/${name}/${name}.html`]: `<template><p>${n}</p></template>`,
      [`lwc/${name}/${name}.js`]: broken
        ? `import { LightningElement } from 'lwc'; export default class B extends LightningElement { broken(`
        : `import { LightningElement } from 'lwc';\nexport default class B extends LightningElement { v = ${n}; }\n`,
      [`lwc/${name}/${name}.js-meta.xml`]: xml('LightningComponentBundle', `<apiVersion>${API}</apiVersion><isExposed>false</isExposed>`)
    }),
    target: name => `lwc/${name}`
  },
  {
    type: 'Static resource', cmd: 'staticresource', name: s => `benchRes${s}`,
    files: (name, n) => ({
      [`staticresources/${name}.js`]: `console.log(${n});`,
      [`staticresources/${name}.resource-meta.xml`]: xml('StaticResource', `<cacheControl>Private</cacheControl><contentType>application/javascript</contentType>`)
    }),
    target: name => `staticresources/${name}.js`
  }
];

const TOOLS = {
  mo: { label: 'mo-dx-plugin', suffix: 'Mo', args: (f, p) => ['deploy', f.cmd, '-p', p, '-o', targetOrg] },
  sf: { label: 'sf project deploy start', suffix: 'Sf', args: (f, p) => ['project', 'deploy', 'start', '--source-dir', p, '-o', targetOrg] }
};

function writeFixture(fixture, tool, n, broken = false) {
  const name = fixture.name(TOOLS[tool].suffix);
  for (const [rel, content] of Object.entries(fixture.files(name, n, broken))) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return path.relative(project, path.join(root, fixture.target(name)));
}

// Strip all ANSI escape sequences (colour and cursor movement) and the "linked
// ESM module" notice that only appears for a `sf plugins link`ed checkout, so
// output size is a conservative count of the text an agent actually reads.
function clean(output) {
  return output
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
    .split('\n')
    .filter(line => !/linked ESM module|auto-transpiled/.test(line))
    .join('\n')
    .trim();
}

// Runs one deploy. Two timings are recorded because the sf CLI process stays
// alive for up to ~1s after printing its result (it exits on a fixed cadence,
// so exit times land in ~1s steps for every command):
//   resultMs - when the last output chunk arrived, i.e. the work is done
//   exitMs   - when the process exited, i.e. what a script or agent waits for
function run(fixture, tool, n, { broken = false, json = false } = {}) {
  const target = writeFixture(fixture, tool, n, broken);
  const argv = [...TOOLS[tool].args(fixture, target), ...(json ? ['--json'] : [])];
  return new Promise(resolve => {
    const start = process.hrtime.bigint();
    const elapsed = () => Number(process.hrtime.bigint() - start) / 1e6;
    const chunks = [];
    let resultMs = 0;
    const child = spawn('sf', argv, { cwd: project });
    const onData = chunk => {
      chunks.push(chunk);
      // The linked-plugin notice arrives at startup; it isn't a result.
      if (!/linked ESM module|auto-transpiled/.test(chunk.toString())) resultMs = elapsed();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', code => {
      const output = clean(Buffer.concat(chunks).toString('utf8'));
      resolve({ resultMs, exitMs: elapsed(), exit: code, bytes: Buffer.byteLength(output), output });
    });
  });
}

const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const stats = xs => ({ median: median(xs), min: Math.min(...xs), max: Math.max(...xs) });

if (padding > 0) {
  const padDir = path.join(root, 'classes', 'benchpad');
  fs.mkdirSync(padDir, { recursive: true });
  for (let i = 0; i < padding; i++) {
    fs.writeFileSync(path.join(padDir, `BenchPad${i}.cls`), `public class BenchPad${i} { public static Integer v() { return ${i}; } }`);
    fs.writeFileSync(path.join(padDir, `BenchPad${i}.cls-meta.xml`), xml('ApexClass', `<apiVersion>${API}</apiVersion><status>Active</status>`));
  }
  console.error(`Wrote ${padding} local-only padding classes`);
}

const results = { scenario, targetOrg, runs, padding, sfVersion: spawnSync('sf', ['--version'], { encoding: 'utf8' }).stdout.trim(), startedAt: new Date().toISOString(), success: [], compileError: [], jsonOutput: [] };

let counter = Date.now() % 100000;
for (const fixture of FIXTURES) {
  const samples = { mo: [], sf: [] };
  for (let i = 0; i <= runs; i++) {
    const order = i % 2 ? ['sf', 'mo'] : ['mo', 'sf'];
    for (const tool of order) {
      const r = await run(fixture, tool, counter++);
      if (r.exit !== 0 || /✖/.test(r.output)) {
        throw new Error(`${TOOLS[tool].label} failed on ${fixture.type} (run ${i}):\n${r.output}`);
      }
      if (i > 0) samples[tool].push(r); // round 0 creates the components: warm-up
    }
    console.error(`${scenario} ${fixture.type}: round ${i}/${runs}`);
  }
  const summarize = rs => ({
    resultMs: stats(rs.map(r => r.resultMs)),
    exitMs: stats(rs.map(r => r.exitMs)),
    medianBytes: median(rs.map(r => r.bytes)),
    samples: rs.map(r => ({ resultMs: Math.round(r.resultMs), exitMs: Math.round(r.exitMs) }))
  });
  results.success.push({ type: fixture.type, mo: summarize(samples.mo), sf: summarize(samples.sf) });
}

// Size of `sf project deploy start --json` output, which agents often request to parse results.
for (const fixture of FIXTURES) {
  const r = await run(fixture, 'sf', counter++, { json: true });
  results.jsonOutput.push({ type: fixture.type, bytes: r.bytes });
}

// Compile-error loop: the case an agent iterates on.
for (const fixture of FIXTURES.filter(f => f.cmd === 'apex' || f.cmd === 'lwc')) {
  const samples = { mo: [], sf: [] };
  for (let i = 0; i < Math.min(runs, 5); i++) {
    const order = i % 2 ? ['sf', 'mo'] : ['mo', 'sf'];
    for (const tool of order) samples[tool].push(await run(fixture, tool, counter++, { broken: true }));
  }
  const sfJson = await run(fixture, 'sf', counter++, { broken: true, json: true });
  // Leave the components compiling again for later scenarios.
  for (const tool of ['mo', 'sf']) await run(fixture, tool, counter++);
  const summarize = rs => ({
    resultMs: stats(rs.map(r => r.resultMs)),
    exitMs: stats(rs.map(r => r.exitMs)),
    bytes: rs.at(-1).bytes,
    exit: rs.at(-1).exit,
    output: rs.at(-1).output
  });
  results.compileError.push({
    type: fixture.type,
    mo: summarize(samples.mo),
    sf: summarize(samples.sf),
    sfJson: { bytes: sfJson.bytes, exit: sfJson.exit, output: sfJson.output }
  });
  console.error(`${scenario} ${fixture.type}: compile-error loop done`);
}

if (padding > 0) fs.rmSync(path.join(root, 'classes', 'benchpad'), { recursive: true, force: true });

results.finishedAt = new Date().toISOString();
const out = args.out ?? `benchmark-${scenario}.json`;
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(results, null, 2) + '\n');

const s = ms => (ms / 1000).toFixed(2);
console.log(`\n### ${scenario}\n`);
console.log('| Type | Time to result: mo-dx / sf (median) | Time to exit: mo-dx / sf (median) | Output bytes: mo-dx / sf |');
console.log('|---|---|---|---|');
for (const r of results.success) {
  console.log(`| ${r.type} | ${s(r.mo.resultMs.median)}s / ${s(r.sf.resultMs.median)}s | ${s(r.mo.exitMs.median)}s / ${s(r.sf.exitMs.median)}s | ${r.mo.medianBytes} / ${r.sf.medianBytes} |`);
}
console.log(`\nResults written to ${out}`);
