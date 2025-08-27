import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WmiApi implements ICredentialType {
	name = 'wmiApi';
	displayName = 'WMI API';
	// Link alla documentazione ufficiale del pacchetto (README repository)
	documentationUrl = 'https://github.com/zampierid4p/n8n-nodes-wmi#readme';
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
