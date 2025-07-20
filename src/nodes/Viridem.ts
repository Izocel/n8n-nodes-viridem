import { N8NPropertiesBuilder, N8NPropertiesBuilderConfig } from '@devlikeapro/n8n-openapi-node';
import { INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';
import * as doc from '../assets/openapi.json';

const config: N8NPropertiesBuilderConfig = {};
const parser = new N8NPropertiesBuilder(doc, config);
const properties = parser.build();

export class Viridem implements INodeType {
	description: INodeTypeDescription = {
		version: 1,
		name: 'viridem',
		displayName: 'Viridem',
		description: "Interact's with Viridem",
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: { name: 'Viridem API' },

		properties,
		icon: 'file:../assets/icon.png',
		iconColor: 'light-green',

		inputs: ['main'],
		outputs: ['main'],
		group: ['transform'],

		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},

		credentials: [
			{
				name: 'viridemOAuth2API',
				displayName: 'Viridem OAuth2 API',
				required: true,
			},
		],
	};

	constructor() {
		properties.forEach((prop: INodeProperties) => {
			this.addAuthenticationToProperties(prop);
		});
	}

	private addAuthenticationToProperties(prop: INodeProperties): void {
		// Check if the property is for operations
		if (!prop.options || prop.name !== 'operation') {
			return;
		}

		// Add authentication to each operation option
		prop.options.forEach((option: any) => {
			// Skip if no routing defined
			if (!option.routing) {
				return option;
			}

			// Ensure request object exists
			if (!option.routing.request) {
				option.routing.request = {};
			}

			// Also ensure we don't override any existing auth headers
			if (!option.routing.request.headers) {
				option.routing.request.headers = {};
			}

			// Set preAuthentication
			option.routing.request.authentication = 'preAuthentication';
		});
	}
}
