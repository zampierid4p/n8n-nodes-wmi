import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WmiApi implements ICredentialType {
	name = 'wmiApi';
	displayName = 'WMI API';
	documentationUrl = 'https://github.com/your-repo/n8n-nodes-wmi#readme';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
