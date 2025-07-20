import { N8NPropertiesBuilder, N8NPropertiesBuilderConfig } from '@devlikeapro/n8n-openapi-node';
import { INodeType, INodeTypeDescription } from 'n8n-workflow';
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
		this.addAuthentication();
	}

	private addAuthentication(): void {
		// Find the operation property and add authentication to each operation
		const operationProp = this.description.properties.find((prop) => prop.name === 'operation');
		if (operationProp && operationProp.options) {
			operationProp.options.forEach((option: any) => {
				if (option.routing?.request) {
					// Set preAuthentication for OAuth2
					option.routing.request.authentication = 'preAuthentication';
				}
			});
		}
	}
}
