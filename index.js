#!/usr/bin/env node

const args = process.argv.slice(2);
let planFile;
let resultFile;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--result-file') {
    resultFile = args[++i];
    if (!resultFile) {
      console.error('Missing path after --result-file.');
      process.exit(1);
    }
  } else if (arg.startsWith('--result-file=')) {
    resultFile = arg.slice('--result-file='.length);
  } else if (arg.startsWith('--')) {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  } else if (!planFile) {
    planFile = arg;
  } else {
    console.error(`Unexpected argument: ${arg}`);
    process.exit(1);
  }
}

require('./lib/standalone').run(planFile, { resultFile });
