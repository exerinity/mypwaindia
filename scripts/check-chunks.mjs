import { readFile as read_file, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath as file_url_to_path } from 'node:url';
import { gzipSync as gzip_sync } from 'node:zlib';

const kib = 1024;
const mib = 1024 * kib;
const project_root = resolve(dirname(file_url_to_path(import.meta.url)), '..');
const dist_root = join(project_root, 'dist');
const scripts_root = join(dist_root, 'i', 'scripts');

const failures = [];
const warnings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : path;
  }));
  return files.flat();
}

function display_path(path) {
  return relative(dist_root, path).split(sep).join('/');
}

function format_size(bytes) {
  if (bytes >= mib) return `${(bytes / mib).toFixed(2)} MiB`;
  return `${(bytes / kib).toFixed(1)} KiB`;
}

function logical_name(path) {
  return path.replace(/-[A-Za-z0-9_-]{8}\.js$/, '.js');
}

function find_chunks(chunks, pattern) {
  return chunks.filter((chunk) => pattern.test(chunk.path));
}

function require_one(chunks, label, pattern) {
  const matches = find_chunks(chunks, pattern);
  if (matches.length !== 1) {
    failures.push(`expected one ${label} chunk, found ${matches.length}`);
    return undefined;
  }
  return matches[0];
}

function enforce_budget(chunk, label, maximum) {
  if (chunk && chunk.raw > maximum) {
    failures.push(`${label} is ${format_size(chunk.raw)}; budget is ${format_size(maximum)} (${chunk.path}).`);
  }
}

let paths;
try {
  paths = (await walk(scripts_root)).filter((path) => path.endsWith('.js'));
} catch (error) {
  console.error(`FAIL ${display_path(scripts_root)}`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const chunks = await Promise.all(paths.map(async (absolute_path) => {
  const contents = await read_file(absolute_path);
  return {
    absolute_path,
    path: display_path(absolute_path),
    contents: contents.toString('utf8'),
    raw: contents.byteLength,
    gzip: gzip_sync(contents, { level: 9 }).byteLength,
    imports: []
  };
}));

const chunks_by_absolute_path = new Map(chunks.map((chunk) => [chunk.absolute_path, chunk]));
const static_import_pattern = /^\s*import(?:\s+[^;\n]*?\s+from)?\s*['"]([^'"]+)['"]\s*;?/gm;

for (const chunk of chunks) {
  for (const match of chunk.contents.matchAll(static_import_pattern)) {
    if (!match[1].startsWith('.')) continue;
    const imported = chunks_by_absolute_path.get(resolve(dirname(chunk.absolute_path), match[1]));
    if (imported) chunk.imports.push(imported);
  }
}

const entry = require_one(chunks, 'entry', /^i\/scripts\/mypwaindia_index-[^/]+\.js$/);
const globe = require_one(chunks, 'globe', /^i\/scripts\/mpi_globe-[^/]+\.js$/);
const shared_three = require_one(chunks, 'shared three.js', /^i\/scripts\/node\/mpi_three-[^/]+\.js$/);
const team_map = require_one(chunks, 'team map', /^i\/scripts\/mpi_teammap-[^/]+\.js$/);

enforce_budget(entry, 'Entry chunk', 64 * kib);
enforce_budget(globe, 'Globe chunk', 4 * mib);
enforce_budget(shared_three, 'Shared three.js chunk', 4.5 * mib);

const application_chunks = chunks.filter((chunk) =>
  /^i\/scripts\/mpi_[^/]+\.js$/.test(chunk.path) && chunk !== globe
);
for (const chunk of application_chunks) {
  enforce_budget(chunk, 'Application chunk', 256 * kib);
}

const initial_chunks = new Set();
function add_static_dependencies(chunk) {
  if (!chunk || initial_chunks.has(chunk)) return;
  initial_chunks.add(chunk);
  for (const imported of chunk.imports) add_static_dependencies(imported);
}
add_static_dependencies(entry);

const initial_raw = [...initial_chunks].reduce((total, chunk) => total + chunk.raw, 0);
const initial_gzip = [...initial_chunks].reduce((total, chunk) => total + chunk.gzip, 0);
if (initial_raw > mib) {
  failures.push(`initial static graph is ${format_size(initial_raw)}; budget is ${format_size(mib)}`);
}

const lazy_only_patterns = [
  ['3D stack', /^(?:i\/scripts\/mpi_(?:teammap|globe)-|i\/scripts\/node\/mpi_three-)/]
];
for (const [label, pattern] of lazy_only_patterns) {
  const leaked = [...initial_chunks].filter((chunk) => pattern.test(chunk.path));
  if (leaked.length) {
    failures.push(`${label} chunks leaked into the initial graph: ${leaked.map((chunk) => chunk.path).join(', ')}`);
  }
}

let service_worker = '';
try {
  service_worker = await read_file(join(dist_root, 'sw.js'), 'utf8');
} catch (error) {
  failures.push(`could not inspect the service worker: ${error instanceof Error ? error.message : error}`);
}
const precached_chunks = chunks.filter((chunk) => service_worker.includes(chunk.path));
const oversized_precached = precached_chunks.filter((chunk) => chunk.raw > 256 * kib);
if (oversized_precached.length) {
  failures.push(`chunks larger than 256 KiB entered the service-worker precache: ${oversized_precached.map((chunk) => chunk.path).join(', ')}`);
}

if (team_map && globe && !team_map.imports.includes(globe)) {
  failures.push(`team map does not statically import the isolated globe chunk (${globe.path})`);
}

if (team_map && shared_three && !team_map.imports.includes(shared_three)) {
  failures.push(`team map does not statically import the shared three.js chunk (${shared_three.path})`);
}

if (globe) {
  const globe_importers = chunks.filter((chunk) => chunk.imports.includes(globe));
  const unexpected = globe_importers.filter((chunk) => chunk !== team_map);
  if (unexpected.length) {
    failures.push(`globe chunk has unexpected importers: ${unexpected.map((chunk) => chunk.path).join(', ')}`);
  }
}

const chunks_by_logical_name = new Map();
for (const chunk of chunks) {
  const name = logical_name(chunk.path);
  chunks_by_logical_name.set(name, [...(chunks_by_logical_name.get(name) ?? []), chunk]);
}
for (const [name, matches] of chunks_by_logical_name) {
  if (matches.length > 1) warnings.push(`${name} appeared ${matches.length}x`);
}

const total_raw = chunks.reduce((total, chunk) => total + chunk.raw, 0);
const total_gzip = chunks.reduce((total, chunk) => total + chunk.gzip, 0);
const precached_raw = precached_chunks.reduce((total, chunk) => total + chunk.raw, 0);
const precached_gzip = precached_chunks.reduce((total, chunk) => total + chunk.gzip, 0);
const largest = [...chunks].sort((a, b) => b.raw - a.raw).slice(0, 15);
const longest_name = Math.max(...largest.map((chunk) => chunk.path.length));

console.log('\nLargest JavaScript chunks (raw / gzip)');
for (const chunk of largest) {
  console.log(`  ${chunk.path.padEnd(longest_name)}  ${format_size(chunk.raw).padStart(10)} / ${format_size(chunk.gzip).padStart(9)}`);
}
console.log(`\nINITIAL STATIC GRAPH: ${initial_chunks.size} chunks, ${format_size(initial_raw)} raw / ${format_size(initial_gzip)} gzip`);
console.log(`PRECACHED JS: ${precached_chunks.length} chunks, ${format_size(precached_raw)} raw / ${format_size(precached_gzip)} gzip`);
console.log(`ALL JS:       ${chunks.length} chunks, ${format_size(total_raw)} raw / ${format_size(total_gzip)} gzip`);

if (warnings.length) {
  console.warn('\nWARN');
  for (const warning of warnings) console.warn(`  - ${warning}`);
}

if (failures.length) {
  console.error('\nFAIL');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log('\nPASS');
}
