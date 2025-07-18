import {
	IAuthenticate,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ViridemOauth implements ICredentialType {
	name = 'ViridemOauth';
	displayName = 'Viridem Oauth Credentials';
	documentationUrl = 'https://viridem.ca/';

	properties: INodeProperties[] = [
		{
			displayName: 'url',
			name: 'url',
			type: 'string',
			default: 'https://demo.viridem.ca/',
		},
		{
			displayName: 'User Name',
			name: 'username',
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

	// This credential is currently not used by any node directly
	// but the HTTP Request node can use it to make requests.
	// The credential is also testable due to the `test` property below
	authenticate: IAuthenticate = {
		type: "generic",
		properties: {
			auth: {
				username: '={{ $credentials.username }}',
				password: '={{ $credentials.password }}',
			},
		},
	};
}
