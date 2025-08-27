import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';
// Import dinamico ritardato per evitare problemi di typing
let wmi: any;

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
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'SELECT * FROM Win32_Processor',
				description: 'The WMI query to execute',
			},
			{
				displayName: 'Verbose Logging',
				name: 'verbose',
				type: 'boolean',
				default: false,
				description: 'Whether to output detailed execution information (host, user, timing, result count) to the server logs. Password is never logged.'
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		if (!wmi) {
			// caricamento lazy
			wmi = await import('node-wmi');
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
		const logDebug = (m: string) => verbose && safeCall('debug', m);
		const logError = (m: string) => verbose && safeCall('error', m);

		logDebug(`[WMI] Execution start: items=${items.length} executionId=${(this as any).getExecutionId?.() || 'n/a'}`);

		for (let i = 0; i < items.length; i++) {
			try {
				const query = this.getNodeParameter('query', i, '') as string;
				if (!query || !query.trim()) {
					throw new NodeOperationError(this.getNode(), 'Query parameter is empty');
				}
				const credentials = await this.getCredentials('wmiApi');
				if (!credentials || typeof credentials !== 'object') {
					throw new NodeOperationError(this.getNode(), 'Missing credentials object');
				}

				const wmiOptions = {
					host: (credentials.host as string) || '',
					user: (credentials.user as string) || '',
					password: (credentials.password as string) || '',
				};
				if (!wmiOptions.host || !wmiOptions.user || !wmiOptions.password) {
					throw new NodeOperationError(this.getNode(), 'One or more required credential fields (host, user, password) are empty');
				}

				logDebug(`[WMI] Item ${i} start host=${wmiOptions.host} user=${wmiOptions.user} query="${query}"`);

				const started = Date.now();
				const data = await new Promise((resolve, reject) => {
					wmi.Query(wmiOptions).exec(query, (err: any, data: any) => {
						if (err) {
							return reject(err);
						}
						resolve(data);
					});
				});

				if (verbose) { const count = Array.isArray(data) ? data.length : (data ? 1 : 0); logDebug(`[WMI] Item ${i} done ${Date.now() - started}ms results=${count}`); }

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
