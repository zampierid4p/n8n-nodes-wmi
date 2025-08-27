import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';
// Import dinamico ritardato per evitare problemi di typing
let wmi: any; // typeof import('node-wmi') in presenza di definizioni

export class Wmi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WMI',
		name: 'wmi',
		icon: 'file:wmi.svg',
		group: ['transform'],
		version: 1,
		description: 'Execute a WMI query',
		defaults: {
			name: 'WMI',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'wmiApi',
				required: true,
			},
		],
		properties: [
			// Engine selection
			{
				displayName: 'Engine',
				name: 'engine',
				type: 'options',
				default: 'node-wmi',
				options: [
					{ name: 'Node WMI (Node-Wmi)', value: 'node-wmi', description: 'Usa libreria node-wmi (WQL) funzionante anche fuori da Windows' },
					{ name: 'WMIC (Wmi-Query)', value: 'wmic', description: 'Usa comando wmic locale (solo host n8n Windows) permette alias e call' },
					{ name: 'Impacket (Python DCOM)', value: 'impacket', description: 'Usa script Python impacket per eseguire query WQL via DCOM (richiede python3 + impacket installati)' },
					{ name: 'WMIC CLI (Linux Samba)', value: 'wmic-cli', description: 'Usa binario wmic (pacchetto samba) su Linux per query WQL remote (solo operation=query)' },
				],
				description: 'Motore di esecuzione. "WMIC" richiede che n8n giri su Windows con wmic disponibile.'
			},
			// Preflight (solo impacket)
			{
				displayName: 'Preflight Check',
				name: 'preflight',
				type: 'boolean',
				default: false,
				description: 'Whether to verify before execution that Python interpreter is available and impacket module importable (fail-fast)',
				displayOptions: { show: { engine: ['impacket'] } },
			},
			// Operation selection
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'query',
				noDataExpression: true,
				options: [
					{ name: 'Query (WQL)', value: 'query', description: 'Esegue query WQL libera o costruita da Class/Properties/Where', action: 'Esegue query WQL' },
					{ name: 'Get (Alias)', value: 'get', description: 'WMIC get su alias (engine WMIC)', action: 'Get alias WMIC' },
					{ name: 'Call (Action)', value: 'call', description: 'WMIC call su alias con action (engine WMIC)', action: 'Call alias WMIC' },
					{ name: 'List Alias', value: 'listAlias', description: 'Elenca alias WMIC disponibili (engine WMIC)', action: 'Elenca alias WMIC' },
				],
				description: 'Tipo di operazione WMI/WMIC da eseguire'
			},
			// Query mode fields
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'SELECT * FROM Win32_OperatingSystem',
				description: 'Query WQL completa (se vuota viene costruita da Class / Properties / Where)',
				displayOptions: { show: { operation: ['query'] } },
			},
			{
				displayName: 'Class',
				name: 'class',
				type: 'string',
				default: '',
				placeholder: 'Win32_Process',
				description: 'Nome della classe WMI da interrogare (usata se Query è vuota)',
				displayOptions: { show: { operation: ['query'] } },
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'string',
				default: '',
				placeholder: 'Name,Version,InstallDate',
				description: 'Lista di proprietà da selezionare (se vuota usa *)',
				displayOptions: { show: { operation: ['query'] } },
			},
			{
				displayName: 'Where',
				name: 'where',
				type: 'string',
				default: '',
				placeholder: "Name = 'wmiPrvSE'",
				description: 'Condizione WHERE senza la parola chiave WHERE (facoltativa)',
				displayOptions: { show: { operation: ['query'] } },
			},
			// WMIC alias operations
			{
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				default: '',
				placeholder: 'os / process / service',
				description: 'Alias WMIC (es. os, service, process). Richiesto per operazioni get/call.',
				displayOptions: { show: { operation: ['get','call'] } },
			},
			{
				displayName: 'Fields',
				name: 'field',
				type: 'string',
				default: '',
				placeholder: 'Name,Version',
				description: 'Campi da recuperare per alias (get)',
				displayOptions: { show: { operation: ['get'] } },
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'string',
				default: '',
				placeholder: 'startservice / stopservice',
				description: 'Azione da eseguire su alias (call)',
				displayOptions: { show: { operation: ['call'] } },
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'JSON',
				options: [ { name: 'JSON', value: 'JSON' } ],
				description: 'Formato output (solo JSON implementato)',
				displayOptions: { show: { operation: ['get','call','listAlias'] } },
			},
			// Common
			{
				displayName: 'Timeout (Ms)',
				name: 'timeout',
				type: 'number',
				default: 60000,
				description: 'Tempo massimo di attesa per ogni item prima di abortire',
				typeOptions: { minValue: 1000 },
			},
			{
				displayName: 'Verbose Logging',
				name: 'verbose',
				type: 'boolean',
				default: false,
				description: 'Whether abilitare log di debug dettagliati (mai stampa la password)'
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const engine = this.getNodeParameter('engine', 0, 'node-wmi') as string;
		const operation = this.getNodeParameter('operation', 0, 'query') as string;
		if (engine === 'node-wmi') {
			if (!wmi) {
				try {
					wmi = await import('node-wmi');
				} catch (e) {
					throw new NodeOperationError(this.getNode(), 'Impossibile caricare la libreria node-wmi: ' + (e as Error).message);
				}
			}
		}
		let wmiQueryModule: any;
		if (engine === 'wmic') {
			if (process.platform !== 'win32') {
				throw new NodeOperationError(this.getNode(), 'Engine WMIC disponibile solo su host n8n Windows');
			}
			try {
				wmiQueryModule = require('../../vendor/wmi-query.js');
			} catch (e) {
				throw new NodeOperationError(this.getNode(), 'Impossibile caricare vendor wmi-query: ' + (e as Error).message);
			}
		}

		const verbose = this.getNodeParameter('verbose', 0, false) as boolean;

		const noop = () => {};
		const rawLogger: any = (this as any).logger || { debug: noop, info: noop, warn: noop, error: noop, log: noop };
		// Wrapper per evitare errori interni su meta undefined
		const safeCall = (level: string, message: string) => {
			try {
				const fn = rawLogger[level] || rawLogger.log || noop;
				// Alcune implementazioni n8n si aspettano sempre un oggetto meta
				fn.call(rawLogger, message, {});
			} catch (e) {
				// fallback silenzioso
			}
		};
		// Estrae file:line del chiamante (per debug approfondito). Calcolato solo se verbose.
		const withLocation = (msg: string): string => {
			try {
				const err = new Error();
				if (!err.stack) return msg;
				const lines = err.stack.split('\n').slice(2); // skip Error + current frame
				// Trova prima riga che punta a questo file
				let target = lines.find(l => l.includes('Wmi.node')) || lines[0];
				if (!target) return msg;
				// Formati possibili: "    at Object.<anonymous> (/path/Wmi.node.ts:123:45)"
				const match = target.match(/\((.*?):(\d+):(\d+)\)/) || target.match(/at (.*?):(\d+):(\d+)/);
				if (!match) return msg;
				const fullPath = match[1];
				const line = match[2];
				const file = fullPath.split(/[\\/]/).pop();
				return `[${file}:${line}] ${msg}`;
			} catch { return msg; }
		};
		const logDebug = (m: string) => verbose && safeCall('debug', withLocation(m));
		const logError = (m: string) => verbose && safeCall('error', withLocation(m));

		logDebug(`[WMI] Execution start: items=${items.length} executionId=${(this as any).getExecutionId?.() || 'n/a'}`);

		for (let i = 0; i < items.length; i++) {
			try {
				const preflight = engine === 'impacket' ? this.getNodeParameter('preflight', i, false) as boolean : false;
				const rawQuery = this.getNodeParameter('query', i, '') as string;
				const klass = this.getNodeParameter('class', i, '') as string;
				const propertiesStr = this.getNodeParameter('properties', i, '') as string;
				const where = this.getNodeParameter('where', i, '') as string;
				const alias = this.getNodeParameter('alias', i, '') as string;
				const field = this.getNodeParameter('field', i, '') as string;
				const action = this.getNodeParameter('action', i, '') as string;
				const format = this.getNodeParameter('format', i, 'JSON') as string;
				let query = rawQuery;
				if (operation === 'query') {
					if (!query && klass) {
						const props = propertiesStr
							.split(',')
							.map(p => p.trim())
							.filter(Boolean);
						const select = props.length ? props.join(', ') : '*';
						query = `SELECT ${select} FROM ${klass}` + (where ? ` WHERE ${where}` : '');
					}
					if (!query || !query.trim()) {
						throw new NodeOperationError(this.getNode(), 'Either Query or Class must be provided');
					}
				}
				const rawTimeout = this.getNodeParameter('timeout', i, 60000) as number | string | undefined;
				let timeoutMs = 60000;
				if (typeof rawTimeout === 'number' && rawTimeout > 0) timeoutMs = rawTimeout;
				else if (typeof rawTimeout === 'string') {
					const parsed = parseInt(rawTimeout, 10);
					if (!isNaN(parsed) && parsed > 0) timeoutMs = parsed;
				}
				if (verbose) logDebug(`[WMI] Item ${i} timeoutMs=${timeoutMs}`);
				const credentials = await this.getCredentials('wmiApi');
				if (!credentials || typeof credentials !== 'object') {
					throw new NodeOperationError(this.getNode(), 'Missing credentials object');
				}

				let userField = (credentials.user as string) || '';
				let domain = (credentials as any).domain as string | undefined;
				if (!domain && userField.includes('\\')) {
					const parts = userField.split('\\');
					if (parts.length >= 2) {
						domain = parts[0];
						userField = parts.slice(1).join('\\');
					}
				}
				// Evita doppio dominio se l'utente ha già DOM\\user e il campo domain è anche valorizzato
				if (domain && userField.includes('\\')) {
					const parts = userField.split('\\');
					if (parts.length >= 2 && parts[0].toLowerCase() === (domain as string).toLowerCase()) {
						userField = parts.slice(1).join('\\');
					}
				}
				const password = (credentials.password as string) || '';
				const userCombined = domain ? `${domain}\\${userField}` : userField;
				const wmiOptions: any = {
					host: (credentials.host as string) || '',
					user: userCombined,  // per node-wmi (user + dominio se presente)
					pass: password,
					username: userCombined, // per motore wmic vendor
					password: password,
				};
				const namespace = (credentials as any).namespace as string | undefined;
				if (namespace) wmiOptions.namespace = namespace.replace(/\\\\/g, '\\');
				if (!wmiOptions.host || !wmiOptions.user || !wmiOptions.pass) {
					throw new NodeOperationError(this.getNode(), 'One or more required credential fields (host, user, password) are empty');
				}
				if (verbose) {
					logDebug(`[WMI] Composed credentials host=${wmiOptions.host} user=${wmiOptions.user} namespace=${wmiOptions.namespace || 'root\\CIMV2'}`);
				}

				if (operation === 'query') {
					logDebug(`[WMI] Item ${i} start engine=${engine} op=query host=${wmiOptions.host} user=${wmiOptions.user} namespace=${wmiOptions.namespace || 'root\\CIMV2'} query="${query}"`);
				} else if (operation === 'get') {
					logDebug(`[WMI] Item ${i} start engine=${engine} op=get alias=${alias} field=${field || '*'} where="${where || ''}" host=${wmiOptions.host}`);
				} else if (operation === 'call') {
					logDebug(`[WMI] Item ${i} start engine=${engine} op=call alias=${alias} action=${action} where="${where || ''}" host=${wmiOptions.host}`);
				} else if (operation === 'listAlias') {
					logDebug(`[WMI] Item ${i} start engine=${engine} op=listAlias host=${wmiOptions.host}`);
				}

				const started = Date.now();
				let data: any;
				if (engine === 'node-wmi' && operation === 'query') {
					data = await new Promise((resolve, reject) => {
						let settled = false;
						const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
							if (settled) return;
							settled = true;
							reject(new Error(`WMI query timeout after ${timeoutMs}ms`));
						}, timeoutMs);
						wmi.Query(wmiOptions).exec(query, (err: any, d: any) => {
							if (settled) return;
							settled = true;
							clearTimeout(timer);
							if (err) {
								return reject(err);
							}
							resolve(d);
						});
					});
				} else if (engine === 'impacket' && operation === 'query') {
					// Esegue script Python impacket wrapper
					const { execFile, spawnSync } = await import('node:child_process');
					// Risoluzione interprete Python con fallback se python3 non presente
					const resolvePython = () => {
						const explicit = process.env.PYTHON_BIN;
						const candidates = [explicit, 'python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3', '/opt/homebrew/bin/python3'].filter(Boolean) as string[];
						for (const c of candidates) {
							try {
								const res = spawnSync(c, ['--version'], { encoding: 'utf8' });
								if (res.error) continue;
								if (res.status === 0 && (res.stdout + res.stderr).toLowerCase().includes('python')) {
									return c;
								}
							} catch {}
						}
						return null;
					};
					const pythonInterpreter = resolvePython();
					if (!pythonInterpreter) {
						throw new NodeOperationError(this.getNode(), 'Python interpreter non trovato. Installa Python 3 oppure imposta variabile ambiente PYTHON_BIN con il percorso completo (es: /usr/local/bin/python3).');
					}
					if (preflight) {
						try {
							const test = spawnSync(pythonInterpreter, ['-c', 'import importlib,sys;importlib.import_module("impacket");sys.stdout.write("OK")'], { encoding: 'utf8', timeout: 4000 });
							if (test.error) { throw new NodeOperationError(this.getNode(), test.error.message); }
							if (test.status !== 0 || !test.stdout.includes('OK')) { throw new NodeOperationError(this.getNode(), `Impacket module non importabile (status=${test.status}) stdout=${test.stdout} stderr=${test.stderr}`); }
							if (verbose) logDebug(`[WMI] Preflight impacket OK using interpreter ${pythonInterpreter}`);
						} catch (e) {
							throw new NodeOperationError(this.getNode(), `Preflight impacket fallito: ${(e as Error).message}`);
						}
					}
					data = await new Promise((resolve, reject) => {
						let done = false;
						const timer = setTimeout(() => {
							if (done) return; done = true; reject(new Error(`Impacket query timeout after ${timeoutMs}ms`));
						}, timeoutMs);
						const args = [
							`${__dirname}/../../python/wmi_impacket_wrapper.py`,
							'--host', wmiOptions.host,
							'--user', wmiOptions.user,
							'--password', wmiOptions.pass,
							'--namespace', wmiOptions.namespace || 'root\\CIMV2',
							'--query', query,
						];
						// Domain: se user include già backslash lo script wrapper userà domain vuoto
						if (wmiOptions.user && wmiOptions.user.includes('\\')) {
							const maybeDomain = wmiOptions.user.split('\\')[0];
							if (maybeDomain && domain && maybeDomain.toLowerCase() === domain.toLowerCase()) {
								args.push('--domain', domain);
							}
						} else if (domain) {
							args.push('--domain', domain);
						}
						const child = execFile(pythonInterpreter, args, { timeout: timeoutMs + 2000 }, (err: any, stdout: string, stderr: string) => {
							if (done) return;
							done = true;
							clearTimeout(timer);
							if (err) {
								if ((err as any).code === 'ENOENT') {
									return reject(new Error(`Impacket exec error: interprete Python non trovato (${pythonInterpreter}). Imposta PYTHON_BIN o installa python3. stderr=${stderr || ''}`));
								}
								return reject(new Error(`Impacket exec error: ${err.message} stderr=${stderr || ''}`));
							}
							try {
								const parsed = JSON.parse(stdout || '{}');
								if (parsed.error) return reject(new Error(parsed.error));
								resolve(parsed.data || []);
							} catch (e) {
								reject(new Error('Impacket JSON parse error: ' + (e as Error).message));
							}
						});
						child.on('error', (e) => {
							if (done) return; done = true; clearTimeout(timer); reject(new Error(`Impacket spawn error: ${(e as Error).message}`));
						});
					});
				} else if (engine === 'wmic-cli' && operation === 'query') {
					// Richiede host Linux con binario wmic (pacchetto samba / samba-common-bin)
					if (process.platform === 'win32') {
						throw new NodeOperationError(this.getNode(), 'Engine wmic-cli è pensato per host n8n Linux (usa engine wmic su Windows)');
					}
					const { exec } = await import('node:child_process');
					data = await new Promise((resolve, reject) => {
						let done = false;
						const timer: ReturnType<typeof setTimeout> = setTimeout(() => { if (done) return; done = true; reject(new Error(`WMIC CLI query timeout after ${timeoutMs}ms`)); }, timeoutMs);
						// Costruzione comando wmic
						// Formato: wmic -U DOM/user%pass //host "SELECT ..."
						const domainPart = domain ? `${domain}/` : '';
						const userNoDomain = userField; // già separato prima
						const cred = `${domainPart}${userNoDomain}%${password.replace(/'/g, "'\\''")}`; // escaping basico
						const wmicBin = process.env.WMIC_BIN || 'wmic';
						const cmd = `${wmicBin} -U '${cred}' //${wmiOptions.host} "${query.replace(/"/g, '\"')}"`;
						if (verbose) logDebug(`[WMI] wmic-cli exec cmd=${cmd}`);
						exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
							if (done) return; done = true; clearTimeout(timer);
							if (err) {
								return reject(new Error(`WMIC CLI exec error: ${err.message} stderr=${stderr || ''}`));
							}
							try {
								// Output wmic CLI è tabellare. Converte in JSON basilare.
								const lines = stdout.split(/\r?\n/).filter(l => l.trim());
								if (lines.length < 2) return resolve([]);
								const header = lines[0].split(/\s{2,}/).map(h => h.trim()).filter(Boolean);
								const rows = lines.slice(1).map(line => {
									const cols = line.split(/\s{2,}/).map(c => c.trim());
									const obj: any = {};
									header.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
									return obj;
								});
								resolve(rows);
							} catch (e) {
								reject(new Error(`WMIC CLI parse error: ${(e as Error).message}`));
							}
						});
					});
				} else if (engine === 'wmic') {
					// Usa vendor wmi-query con alias / call / listAlias
					data = await new Promise((resolve, reject) => {
						let done = false;
						const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
							if (done) return; done = true; reject(new Error(`WMIC ${operation} timeout after ${timeoutMs}ms`));
						}, timeoutMs);
						const opts: any = { node: wmiOptions.host, format, timeout: timeoutMs };
						if (wmiOptions.username && wmiOptions.password) { opts.user = wmiOptions.username; opts.password = wmiOptions.password; }
						if (operation === 'get') { opts.alias = alias; if (field) opts.field = field; if (where) opts.where = where; wmiQueryModule.Query.get(opts, (r: any) => { if (done) return; done = true; clearTimeout(timer); return r.err ? reject(new Error(r.err.message || 'WMIC get error')) : resolve(r.data); }); }
						else if (operation === 'call') { opts.alias = alias; if (where) opts.where = where; if (action) opts.action = action; wmiQueryModule.Query.call(opts, (r: any) => { if (done) return; done = true; clearTimeout(timer); return r.err ? reject(new Error(r.err.message || 'WMIC call error')) : resolve(r.data); }); }
						else if (operation === 'listAlias') { wmiQueryModule.Query.listAlias(opts, (r: any) => { if (done) return; done = true; clearTimeout(timer); return r.err ? reject(new Error(r.err.message || 'WMIC listAlias error')) : resolve(r.data); }); }
						else if (operation === 'query') { reject(new Error('Operation query non supportata con engine wmic (usa engine node-wmi)')); }
					});
				} else {
					throw new NodeOperationError(this.getNode(), `Combinazione engine=${engine} operation=${operation} non supportata`);
				}

				if (verbose) { const count = Array.isArray(data) ? data.length : (data ? 1 : 0); logDebug(`[WMI] Item ${i} done op=${operation} ${Date.now() - started}ms results=${count}`); }

				returnData.push({
					json: { data: data as any[] },
					pairedItem: { item: i },
				});
			} catch (error) {
				// Aggiunge contesto ad errori generici 'Cannot convert undefined or null to object'
				if ((error as Error).message && (error as Error).message.includes('Cannot convert undefined or null to object')) {
					(error as Error).message = `WMI internal error (possible invalid credentials or query). Original: ${(error as Error).message}`;
				}
				logError(`[WMI] Item ${i} error: ${(error as Error).message}`);
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error);
			}
		}

		logDebug('[WMI] Execution end');

		return [returnData];
	}
}
