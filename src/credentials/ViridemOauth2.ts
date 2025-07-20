import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';
import { configs } from '../utils/Configs';

// Token cache shared across instances
const tokenCache: { [key: string]: { token: string; expires: number } } = {};

export class ViridemOauth2 implements ICredentialType {
	name = 'viridemOauth2';
	displayName = 'Viridem Oauth2';

	properties: INodeProperties[] = [
		{
			displayName: 'Viridem URL',
			name: 'baseUrl',
			type: 'string',
			default: configs.getString('VIRIDEM_BASE_URL'),
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: configs.getString('VIRIDEM_USERNAME'),
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: configs.getString('VIRIDEM_PASSWORD'),
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: configs.getString('VIRIDEM_CLIENT_ID'),
		},
		{
			displayName: 'Client Secret',
			name: 'client_secret',
			type: 'string',
			typeOptions: { password: true },
			default: configs.getString('VIRIDEM_CLIENT_SECRET'),
		},
	];

	// Test OAuth token endpoint with credentials
	test: ICredentialTestRequest = {
		request: {
			url: '={{$credentials.baseUrl}}/api/oauth/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization:
					'=Basic {{Buffer.from($credentials.client_id + ":" + $credentials.client_secret).toString("base64")}}',
			},
			body: {
				grant_type: 'password',
				client_id: '={{$credentials.client_id}}',
				client_secret: '={{$credentials.client_secret}}',
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	// Standard n8n authenticate method
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: any,
	): Promise<any> {
		try {
			const token = await ViridemOauth2.getAccessToken(credentials);

			let authHeader: string;
			if (token.startsWith('Basic ') || token.startsWith('Bearer ')) {
				authHeader = token;
			} else {
				authHeader = `Bearer ${token}`;
			}

			// Set the Authorization header
			if (!requestOptions.headers) {
				requestOptions.headers = {};
			}
			requestOptions.headers.Authorization = authHeader;

			return requestOptions;
		} catch (error: any) {
			throw error;
		}
	}

	// PreAuthentication method used by n8n's OpenAPI-generated nodes
	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<IDataObject> {
		try {
			const token = await ViridemOauth2.getAccessToken(credentials);

			// Check if token is already a complete auth header or just the token part
			let authHeader: string;
			if (token.startsWith('Basic ') || token.startsWith('Bearer ')) {
				authHeader = token;
			} else {
				authHeader = `Bearer ${token}`;
			}

			// Return the authorization headers that will be merged into the request
			return {
				Authorization: authHeader,
			};
		} catch (error: any) {
			throw error;
		}
	}

	// Helper method to get OAuth token - used by nodes
	static async getAccessToken(credentials: ICredentialDataDecryptedObject): Promise<string> {
		const cacheKey = `${credentials.baseUrl}-${credentials.username}`;
		const now = Date.now();

		// Check if we have a valid cached token
		if (tokenCache[cacheKey] && tokenCache[cacheKey].expires > now) {
			return tokenCache[cacheKey].token;
		}

		// Validate credentials
		if (
			!credentials.client_id ||
			!credentials.client_secret ||
			!credentials.username ||
			!credentials.password
		) {
			throw new Error(
				'Missing required credentials: client_id, client_secret, username, or password',
			);
		}

		// Get new token using fetch
		const tokenBody = new URLSearchParams({
			grant_type: 'password',
			client_id: credentials.client_id as string,
			client_secret: credentials.client_secret as string,
			username: credentials.username as string,
			password: credentials.password as string,
		});

		try {
			// Based on Swagger UI behavior, try using Basic Auth for the OAuth2 token request
			const clientAuth = Buffer.from(
				`${credentials.client_id}:${credentials.client_secret}`,
			).toString('base64');

			const response = await fetch(`${credentials.baseUrl}/api/oauth/token`, {
				method: 'POST',
				body: tokenBody.toString(),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${clientAuth}`,
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as any;

			if (data.error || !data.access_token) {
				throw new Error(
					`OAuth2 Error: ${data.error || 'No access token received'} - ${data.error_description || ''}`,
				);
			}

			// Cache the token (store just the token value, not the full auth header)
			const expiresIn = (data.expires_in || 3600) * 1000;
			const expiryTime = now + expiresIn - 60000;

			tokenCache[cacheKey] = {
				token: data.access_token, // Store just the token value
				expires: expiryTime,
			};

			return data.access_token; // Return just the token value
		} catch (error: any) {
			try {
				const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
					'base64',
				);

				const testResponse = await fetch(`${credentials.baseUrl}/api/v1/viridem/versions`, {
					method: 'GET',
					headers: {
						Authorization: `Basic ${basicAuth}`,
						'Content-Type': 'application/json',
					},
				});

				if (testResponse.ok) {
					// Cache the full basic auth header as token
					const basicAuthHeader = `Basic ${basicAuth}`;
					tokenCache[cacheKey] = {
						token: basicAuthHeader, // Store the full auth header for Basic auth
						expires: now + 3600000, // 1 hour
					};
					return basicAuthHeader; // Return the full auth header for Basic auth
				}
			} catch (basicAuthError: any) {
				console.error(`Basic auth failed: ${basicAuthError.message}`);
			}

			throw new Error(
				`Authentication failed: OAuth2 failed (${error.message}), Basic Auth also failed`,
			);
		}
	}
}
