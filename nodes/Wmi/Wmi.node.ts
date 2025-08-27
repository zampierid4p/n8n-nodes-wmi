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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		if (!wmi) {
			// caricamento lazy
			wmi = await import('node-wmi');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const query = this.getNodeParameter('query', i, '') as string;
				const credentials = await this.getCredentials('wmiApi');

				const wmiOptions = {
					host: credentials.host as string,
					user: credentials.user as string,
					password: credentials.password as string,
				};

				const data = await new Promise((resolve, reject) => {
					wmi.Query(wmiOptions).exec(query, (err: any, data: any) => {
						if (err) {
							return reject(err);
						}
						resolve(data);
					});
				});

				returnData.push({
					json: { data: data as any[] },
					pairedItem: { item: i },
				});
			} catch (error) {
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

		return [returnData];
	}
}
