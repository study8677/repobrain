#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredDocs = [
  'docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md',
  'docs/marketing/01_AGENT_OUTPUT_CONTRACT.md',
  'docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md',
  'docs/marketing/03_CONTENT_ATOM_SCHEMA.md',
  'docs/marketing/04_DELIVERY_QUALITY_GATE.md',
  'docs/marketing/05_AGENT_COMPULSION_MECHANISM.md',
];

const missing = requiredDocs.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error('Missing required marketing standard documents:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const markerTerms = [
  'Hook / Proof / Depth',
  'Delivery Quality Gate',
  'Agent Output Contract',
  'dual-asset pattern',
];

const docsText = requiredDocs
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

const missingTerms = markerTerms.filter((term) => !docsText.includes(term));

if (missingTerms.length) {
  console.error('Marketing standards are present but missing required enforcement terms:');
  for (const term of missingTerms) console.error(`- ${term}`);
  process.exit(1);
}

console.log('Marketing quality gate documents are present and contain required enforcement language.');
