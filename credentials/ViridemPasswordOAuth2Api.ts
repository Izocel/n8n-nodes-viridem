import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	IAuthenticateGeneric,
} from 'n8n-workflow';

export class ViridemPasswordOAuth2Api implements ICredentialType {
	name = 'viridemPasswordOAuth2Api';
	displayName = 'Viridem OAuth2 API (Password Grant)';

	properties: INodeProperties[] = [
		{
			displayName: 'Viridem URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://demo.viridem.ca',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'client_secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/viridem/version',
			method: 'GET',
		},
	};
}