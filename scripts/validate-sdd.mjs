#!/usr/bin/env node
/**
 * Ensures each docs/specs/features/F-* folder has spec.md, design.md, implementation-plan.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresRoot = path.resolve(__dirname, '../docs/specs/features');
const required = ['spec.md', 'design.md', 'implementation-plan.md'];

if (!fs.existsSync(featuresRoot)) {
  console.error('Missing docs/specs/features/');
  process.exit(1);
}

const dirs = fs.readdirSync(featuresRoot, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^F-\d+/.test(d.name))
  .map(d => d.name);

let failed = false;
for (const dir of dirs) {
  const full = path.join(featuresRoot, dir);
  for (const file of required) {
    const p = path.join(full, file);
    if (!fs.existsSync(p)) {
      console.error(`[sdd:check] ${dir}: missing ${file}`);
      failed = true;
    }
  }
}

if (dirs.length === 0) {
  console.warn('[sdd:check] no F-* feature folders found');
}

if (failed) process.exit(1);
console.log(`[sdd:check] OK — ${dirs.length} feature folder(s)`);
