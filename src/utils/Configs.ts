import * as dotenv from 'dotenv';

// Load environment variables as early as possible
dotenv.config();

export class Configs {
	private static instance: Configs;

	private constructor() {
		// Constructor is private for singleton pattern
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): Configs {
		if (!Configs.instance) {
			Configs.instance = new Configs();
		}
		return Configs.instance;
	}

	/**
	 * Get an environment variable
	 * @param key - Environment variable name
	 * @param defaultValue - Default value if not found
	 */
	public get(key: string, defaultValue: string = ''): string | undefined {
		return process.env[key] || defaultValue;
	}

	/**
	 * Check if an environment variable exists
	 * @param key - Environment variable name
	 */
	public has(key: string): boolean {
		return key in process.env && process.env[key] !== undefined;
	}

	/**
	 * Get all environment variables
	 */
	public getAll(): { [key: string]: string } {
		// Filter out undefined values from process.env
		return Object.entries(process.env).reduce(
			(acc, [key, value]) => {
				if (value !== undefined) {
					acc[key] = value;
				}
				return acc;
			},
			{} as { [key: string]: string },
		);
	}
}

// Export singleton instance for easy use
export const configs = Configs.getInstance();
