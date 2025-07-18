import { INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { N8NPropertiesBuilder, N8NPropertiesBuilderConfig } from '@devlikeapro/n8n-openapi-node';
import * as doc from './openapi.json';

const config: N8NPropertiesBuilderConfig = {}
const parser = new N8NPropertiesBuilder(doc, config);
const properties = parser.build()

export class Viridem implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Viridem',
		name: 'viridem',
		icon: 'file:logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Viridem API',
		defaults: {
			name: 'Viridem',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
		},
		credentials: [
			{
				name: 'viridemPasswordOAuth2Api',
				required: true,
			},
		],
		properties: properties,
	};
}