#!/usr/bin/env node
/*
 * Script di rilascio semplificato.
 * Flusso:
 * 1. Controllo che working tree sia pulito
 * 2. Lint + build
 * 3. Bump versione (patch di default) oppure argomento (major|minor|patch|x.y.z)
 * 4. Aggiorna CHANGELOG (placeholder su [Unreleased])
 * 5. Commit + tag
 * 6. Publish npm
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function run(cmd) {
  return execSync(cmd, { stdio: 'inherit' });
}

function getStdout(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function ensureCleanTree() {
  const status = getStdout('git status --porcelain');
  if (status) {
    console.error('Working tree sporco. Effettua commit o stash prima del release.');
    process.exit(1);
  }
}

function determineNewVersion(spec) {
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!spec) spec = 'patch';
  const semver = pkg.version.split('.').map(Number);
  if (/^(major|minor|patch)$/.test(spec)) {
    if (spec === 'major') { semver[0]++; semver[1] = 0; semver[2] = 0; }
    if (spec === 'minor') { semver[1]++; semver[2] = 0; }
    if (spec === 'patch') { semver[2]++; }
    return semver.join('.');
  } else if (/^\d+\.\d+\.\d+$/.test(spec)) {
    return spec;
  } else {
    console.error('Spec versione non valida:', spec);
    process.exit(1);
  }
}

function updatePackageVersion(newVersion) {
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function updateChangelog(newVersion) {
  const clPath = path.resolve('CHANGELOG.md');
  if (!fs.existsSync(clPath)) return;
  const today = new Date().toISOString().slice(0, 10);
  let content = fs.readFileSync(clPath, 'utf8');
  if (!content.includes('[Unreleased]')) return; // fallback semplice
  // Inserisce nuova sezione vuota sopra l'ultima [x.y.z]
  const unreleasedHeader = '## [Unreleased]';
  if (content.includes(`## [${newVersion}]`)) return; // già presente
  content = content.replace(unreleasedHeader, `${unreleasedHeader}\n\n## [${newVersion}] - ${today}\n\n### Added\n\n### Changed\n\n### Fixed\n`);
  // Aggiorna link in fondo
  content = content.replace(/\[Unreleased\]: .*\n/, `[Unreleased]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v${newVersion}...HEAD\n`);
  const compareRegex = /\n\[0\.1\.0\]:/; // lascia intatti gli altri
  // Aggiunge link versione se non presente
  if (!content.includes(`[${newVersion}]:`)) {
    content = content.replace('\n[0.1.2]:', `\n[${newVersion}]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/vPREV...v${newVersion}\n[0.1.2]:`);
  }
  fs.writeFileSync(clPath, content);
}

function main() {
  const spec = process.argv[2];
  ensureCleanTree();
  run('npm run lint');
  run('npm run build');
  const newVersion = determineNewVersion(spec);
  updatePackageVersion(newVersion);
  updateChangelog(newVersion); // best effort
  run('git add package.json CHANGELOG.md');
  run(`git commit -m "chore(release): v${newVersion}"`);
  run(`git tag v${newVersion}`);
  run('npm publish');
  console.log(`Rilascio completato v${newVersion}`);
}

main();
