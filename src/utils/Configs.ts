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
	public get(key: string, defaultValue?: string): string | undefined {
		return process.env[key] || defaultValue;
	}

	/**
	 * Get an environment variable as string (throws if not found and no default)
	 * @param key - Environment variable name
	 * @param defaultValue - Default value if not found
	 */
	public getString(key: string, defaultValue?: string): string {
		const value = this.get(key, defaultValue);
		if (value === undefined) {
			throw new Error(`Required environment variable '${key}' is not defined`);
		}
		return value;
	}

	/**
	 * Get an environment variable as number
	 * @param key - Environment variable name
	 * @param defaultValue - Default value if not found
	 */
	public getNumber(key: string, defaultValue?: number): number {
		const value = this.get(key);
		if (value === undefined) {
			if (defaultValue !== undefined) {
				return defaultValue;
			}
			throw new Error(`Required environment variable '${key}' is not defined`);
		}

		const numValue = Number(value);
		if (isNaN(numValue)) {
			throw new Error(`Environment variable '${key}' is not a valid number: ${value}`);
		}
		return numValue;
	}

	/**
	 * Get an environment variable as boolean
	 * @param key - Environment variable name
	 * @param defaultValue - Default value if not found
	 */
	public getBoolean(key: string, defaultValue?: boolean): boolean {
		const value = this.get(key);
		if (value === undefined) {
			if (defaultValue !== undefined) {
				return defaultValue;
			}
			throw new Error(`Required environment variable '${key}' is not defined`);
		}

		return value.toLowerCase() === 'true' || value === '1';
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
