import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';
import { configs } from '../utils/Configs';
import { TokenCacheManager } from '../utils/TokenCacheManager';

// Register the key generation strategy
TokenCacheManager.getInstance().registerKeyGenerator('ViridemOAuth2API', (credentials: any) => {
	if (credentials.clientId && credentials.baseUrl) {
		return `viridem_${credentials.clientId}_${credentials.baseUrl}`;
	}
	return `viridem_${credentials.username || 'unknown'}_${credentials.baseUrl || 'default'}`;
});

// Register cache configuration
TokenCacheManager.getInstance().registerCacheConfig('ViridemOAuth2API', {
	bufferTime: 60000, // 1 minute buffer before expiry
	defaultTokenExpiry: 3600000, // 1 hour for basic auth
	minCacheDuration: 300000, // 5 minutes minimum
	cleanupInterval: 300000, // 5 minutes cleanup interval
});

// OAuth2 token response interface
interface OAuth2TokenResponse {
	access_token?: string;
	expires_in?: number;
	error?: string;
	error_description?: string;
}

export class ViridemOAuth2API implements ICredentialType {
	name = 'viridemOAuth2API';
	displayName = 'Viridem OAuth2 API';

	properties: INodeProperties[] = [
		{
			displayName: 'Viridem URL',
			name: 'baseUrl',
			type: 'string',
			default: configs.get('VIRIDEM_BASE_URL'),
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: configs.get('VIRIDEM_USERNAME'),
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: configs.get('VIRIDEM_PASSWORD'),
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: configs.get('VIRIDEM_CLIENT_ID'),
		},
		{
			displayName: 'Client Secret',
			name: 'client_secret',
			type: 'string',
			typeOptions: { password: true },
			default: configs.get('VIRIDEM_CLIENT_SECRET'),
		},
	];

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
			// Set the Authorization header based on token type
			if (!requestOptions.headers) {
				requestOptions.headers = {};
			}

			const token = await ViridemOAuth2API.getAccessToken(credentials);
			requestOptions.headers.Authorization = ViridemOAuth2API.formatAuthHeader(token);

			return requestOptions;
		} catch (error: any) {
			throw new Error(`Authentication failed: ${error.message}`);
		}
	}

	// PreAuthentication method used by n8n's OpenAPI-generated nodes
	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<IDataObject> {
		try {
			const token = await ViridemOAuth2API.getAccessToken(credentials);

			// Return the authorization headers that will be merged into the request
			return {
				Authorization: ViridemOAuth2API.formatAuthHeader(token),
			};
		} catch (error: any) {
			throw new Error(`Pre-authentication failed: ${error.message}`);
		}
	}

	// Helper method to format auth header consistently
	private static formatAuthHeader(token: string): string {
		// If token already contains auth type prefix, return as-is
		if (token.startsWith('Basic ') || token.startsWith('Bearer ')) {
			return token;
		}

		// For OAuth2 tokens without prefix, add Bearer
		return `Bearer ${token}`;
	}

	// Helper method to get OAuth token - used by nodes
	static async getAccessToken(credentials: ICredentialDataDecryptedObject): Promise<string> {
		const now = Date.now();
		const cacheManager = TokenCacheManager.getInstance();

		// Check if we have a valid cached token
		const cachedToken = cacheManager.getByCredentials('ViridemOAuth2API', credentials);
		if (cachedToken && cachedToken.expires > now) {
			return cachedToken.token;
		}

		// Validate required credentials
		const requiredFields = ['client_id', 'client_secret', 'username', 'password', 'baseUrl'];
		const missingFields = requiredFields.filter((field) => !credentials[field]);

		if (missingFields.length > 0) {
			throw new Error(`Missing required credentials: ${missingFields.join(', ')}`);
		}

		// Try OAuth2 first, then fall back to Basic Auth
		try {
			return await ViridemOAuth2API.tryOAuth2Authentication(credentials, now);
		} catch (oauthError) {
			console.warn(`OAuth2 authentication failed: ${oauthError.message}. Trying Basic Auth...`);

			try {
				return await ViridemOAuth2API.tryBasicAuthentication(credentials, now);
			} catch (basicError) {
				throw new Error(
					`All authentication methods failed. OAuth2: ${oauthError.message}. Basic Auth: ${basicError.message}`,
				);
			}
		}
	}

	// Private method for OAuth2 authentication
	private static async tryOAuth2Authentication(
		credentials: ICredentialDataDecryptedObject,
		now: number,
	): Promise<string> {
		const tokenBody = new URLSearchParams({
			grant_type: 'password',
			client_id: credentials.client_id as string,
			client_secret: credentials.client_secret as string,
			username: credentials.username as string,
			password: credentials.password as string,
		});

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
			const errorText = await response.text();
			throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
		}

		const data = (await response.json()) as OAuth2TokenResponse;

		if (data.error || !data.access_token) {
			throw new Error(`OAuth2 Error: ${data.error || 'No access token received'}`);
		}

		// Cache the OAuth2 token
		const cacheManager = TokenCacheManager.getInstance();
		const cacheEntry = cacheManager.createOAuthEntry(
			'ViridemOAuth2API',
			data.access_token,
			data.expires_in || 3600,
		);
		cacheManager.setByCredentials('ViridemOAuth2API', credentials, cacheEntry);

		return data.access_token;
	}

	// Private method for Basic Auth fallback
	private static async tryBasicAuthentication(
		credentials: ICredentialDataDecryptedObject,
		now: number,
	): Promise<string> {
		const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
			'base64',
		);

		const basicAuthHeader = `Basic ${basicAuth}`;

		// Test the basic auth with a lightweight endpoint
		const testResponse = await fetch(`${credentials.baseUrl}/api/v1/viridem/versions`, {
			method: 'GET',
			headers: {
				Authorization: basicAuthHeader,
				'Content-Type': 'application/json',
			},
		});

		if (!testResponse.ok) {
			const errorText = await testResponse.text();
			throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}. ${errorText}`);
		}

		// Cache the Basic Auth header
		const cacheManager = TokenCacheManager.getInstance();
		const cacheEntry = cacheManager.createBasicAuthEntry('ViridemOAuth2API', basicAuthHeader);
		cacheManager.setByCredentials('ViridemOAuth2API', credentials, cacheEntry);

		return basicAuthHeader;
	}
}
