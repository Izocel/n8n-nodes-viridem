import { N8NPropertiesBuilder, N8NPropertiesBuilderConfig } from '@devlikeapro/n8n-openapi-node';
import { INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';
import * as doc from '../assets/openapi.json';

const config: N8NPropertiesBuilderConfig = {};
const parser = new N8NPropertiesBuilder(doc, config);
const properties = parser.build();

// Add authentication to all operations
const addAuthenticationToProperties = (prop: INodeProperties): void => {
	if (prop.name === 'operation' && prop.options) {
		// Add authentication to each operation option
		prop.options = prop.options.map((option: any) => {
			if (option.routing) {
				// Ensure request object exists
				if (!option.routing.request) {
					option.routing.request = {};
				}

				// Set preAuthentication
				option.routing.request.authentication = 'preAuthentication';

				// Also ensure we don't override any existing auth headers
				if (!option.routing.request.headers) {
					option.routing.request.headers = {};
				}
			}
			return option;
		});
	}
};

// Apply authentication to all properties
properties.forEach((prop: INodeProperties) => {
	addAuthenticationToProperties(prop);
});

export class Viridem implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Viridem',
		name: 'viridem',
		icon: 'file:../assets/logo.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Viridem API',
		defaults: {
			name: 'Viridem',
		},
		properties,
		inputs: ['main'],
		outputs: ['main'],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		credentials: [
			{
				name: 'viridemOauth2',
				required: true,
			},
		],
	};
}
