/*
 * Harness di test per il nodo WMI fuori da n8n.
 * Simula l'ambiente minimo di esecuzione IExecuteFunctions per eseguire la logica del nodo.
 * Permette di:
 *  - Passare query e credenziali via variabili d'ambiente / CLI
 *  - Abilitare verbose logging
 *  - Stampare risultati o errori
 *  - Misurare timing
 *
 * USO:
 *  1. npm install
 *  2. npm run build
 *  3. node harness/run.js --query "SELECT * FROM Win32_OperatingSystem" \
 *       --host 192.168.1.10 --user Administrator --password "Secret" --verbose
 *
 * Oppure usare variabili d'ambiente:
 *    WMI_QUERY=... WMI_HOST=... WMI_USER=... WMI_PASSWORD=... VERBOSE=1 node harness/run.js
 */

const path = require('path');
const { Wmi } = require('../dist/nodes/Wmi/Wmi.node.js');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      out[key] = val;
    }
  }
  return out;
}

const cli = parseArgs();

const RAW_QUERY = cli.query || process.env.WMI_QUERY || '';
const CLASS = cli.class || process.env.WMI_CLASS || '';
const PROPERTIES = cli.properties || process.env.WMI_PROPERTIES || '';
const WHERE = cli.where || process.env.WMI_WHERE || '';
const HOST = cli.host || process.env.WMI_HOST;
let USER = cli.user || process.env.WMI_USER;
const PASSWORD = cli.password || process.env.WMI_PASSWORD;
let DOMAIN = cli.domain || process.env.WMI_DOMAIN || '';
// Se user contiene backslash e domain non esplicitato, estrai
if (!DOMAIN && USER && USER.includes('\\')) {
  const parts = USER.split('\\');
  if (parts.length >= 2) {
    DOMAIN = parts[0];
    USER = parts.slice(1).join('\\');
  }
}
// Costruzione query se non fornita esplicitamente
let QUERY = RAW_QUERY;
if (!QUERY) {
  if (CLASS) {
    const props = PROPERTIES.split(',').map(p => p.trim()).filter(Boolean);
    const select = props.length ? props.join(', ') : '*';
    QUERY = `SELECT ${select} FROM ${CLASS}` + (WHERE ? ` WHERE ${WHERE}` : '');
  } else {
    QUERY = 'SELECT * FROM Win32_OperatingSystem';
  }
}
const VERBOSE = cli.verbose === 'true' || cli.verbose === '1' || process.env.VERBOSE === '1';

if (!HOST || !USER || !PASSWORD) {
  console.error('[HARNESS] Devi fornire host, user e password (CLI o env).');
  process.exit(1);
}

// Simulazione minima di IExecuteFunctions
class ExecuteFunctionsMock {
  constructor(items) {
    this.items = items;
    this.node = { name: 'WMI' };
    this.logger = {
  debug: (m, meta) => VERBOSE && console.debug(loc(m), meta || {}),
  info: (m, meta) => console.info(loc(m), meta || {}),
  warn: (m, meta) => console.warn(loc(m), meta || {}),
  error: (m, meta) => console.error(loc(m), meta || {}),
  log: (m, meta) => console.log(loc(m), meta || {}),
    };
  }
  getInputData() { return this.items; }
  getNodeParameter(name, index) {
    if (name === 'query') return QUERY;
    if (name === 'class') return CLASS;
    if (name === 'properties') return PROPERTIES;
    if (name === 'where') return WHERE;
    if (name === 'verbose') return VERBOSE;
    return undefined;
  }
  getCredentials() { return { host: HOST, user: DOMAIN ? `${DOMAIN}\\${USER}` : USER, password: PASSWORD, domain: DOMAIN }; }
  getNode() { return this.node; }
  continueOnFail() { return false; }
  getExecutionId() { return 'harness-exec'; }
}

async function main() {
  console.log('[HARNESS] Avvio harness WMI');
  console.log('[HARNESS] Query:', QUERY);
  if (DOMAIN) console.log('[HARNESS] Domain:', DOMAIN);
  if (CLASS) console.log('[HARNESS] Class:', CLASS, 'Properties:', PROPERTIES || '(all)', 'Where:', WHERE || '(none)');
  const wmiNode = new Wmi();
  const ctx = new ExecuteFunctionsMock([{ json: {} }]);
  const started = Date.now();
  try {
    const result = await wmiNode.execute.call(ctx);
    const ms = Date.now() - started;
    console.log(`[HARNESS] Esecuzione completata in ${ms}ms`);
    console.dir(result, { depth: 6, colors: true });
  } catch (err) {
    console.error('[HARNESS] Errore esecuzione:', err.message);
    console.error(err);
    process.exit(2);
  }
}

// Aggiunge file:line al messaggio
function loc(msg) {
  try {
    const e = new Error();
    if (!e.stack) return msg;
    const lines = e.stack.split('\n').slice(2);
    const target = lines.find(l => l.includes('run.js')) || lines[0];
    if (!target) return msg;
    const match = target.match(/\((.*?):(\d+):(\d+)\)/) || target.match(/at (.*?):(\d+):(\d+)/);
    if (!match) return msg;
    const file = match[1].split(/[\\/]/).pop();
    const line = match[2];
    return `[${file}:${line}] ${msg}`;
  } catch { return msg; }
}

main();
