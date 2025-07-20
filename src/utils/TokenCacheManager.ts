// Token cache interface for better type safety
export interface TokenCacheEntry {
	token: string;
	expires: number;
	type: 'oauth' | 'basic';
}

// Cache key generator function type
export type CacheKeyGenerator = (credentials: any) => string;

// Cache configuration interface
export interface CacheConfig {
	bufferTime: number; // Time buffer before token expiry
	defaultTokenExpiry: number; // Default token expiry time
	minCacheDuration: number; // Minimum cache duration
	cleanupInterval: number; // Cleanup interval in milliseconds
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
	bufferTime: 60000, // 1 minute buffer before expiry
	defaultTokenExpiry: 3600000, // 1 hour for basic auth
	minCacheDuration: 300000, // 5 minutes minimum
	cleanupInterval: 300000, // 5 minutes cleanup interval
};

/**
 * Singleton Token Cache Manager for managing authentication tokens
 * Provides automatic cleanup of expired tokens and memory management
 */
export class TokenCacheManager {
	private static instance: TokenCacheManager;
	private cache: Map<string, TokenCacheEntry> = new Map();
	private cleanupInterval: NodeJS.Timeout | null = null;
	private keyGenerators: Map<string, CacheKeyGenerator> = new Map();
	private cacheConfigs: Map<string, CacheConfig> = new Map();

	private constructor() {
		// Private constructor for singleton pattern
		this.startCleanupInterval();
	}

	/**
	 * Get the singleton instance of TokenCacheManager
	 */
	static getInstance(): TokenCacheManager {
		if (!TokenCacheManager.instance) {
			TokenCacheManager.instance = new TokenCacheManager();
		}
		return TokenCacheManager.instance;
	}

	/**
	 * Register a cache key generator for a specific credential type
	 */
	registerKeyGenerator(credentialType: string, generator: CacheKeyGenerator): void {
		this.keyGenerators.set(credentialType, generator);
	}

	/**
	 * Register cache configuration for a specific credential type
	 */
	registerCacheConfig(credentialType: string, config: Partial<CacheConfig>): void {
		// Merge with default configuration
		const fullConfig: CacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
		this.cacheConfigs.set(credentialType, fullConfig);
	}

	/**
	 * Get cache configuration for a credential type (or default if not registered)
	 */
	getCacheConfig(credentialType: string): CacheConfig {
		return this.cacheConfigs.get(credentialType) || DEFAULT_CACHE_CONFIG;
	}

	/**
	 * Generate a cache key using the registered generator for the credential type
	 */
	generateKey(credentialType: string, credentials: any): string {
		const generator = this.keyGenerators.get(credentialType);
		if (generator) {
			return generator(credentials);
		}

		// Fallback to default key generation if no generator is registered
		return this.defaultKeyGenerator(credentials);
	}

	/**
	 * Default key generation strategy
	 */
	private defaultKeyGenerator(credentials: any): string {
		// Use baseUrl and username as default, but make it safe for undefined values
		const baseUrl = credentials.baseUrl || 'unknown';
		const username = credentials.username || credentials.user || 'anonymous';
		return `${baseUrl}-${username}`;
	}

	/**
	 * Get a cached token entry using credential-based key generation
	 */
	getByCredentials(credentialType: string, credentials: any): TokenCacheEntry | undefined {
		const key = this.generateKey(credentialType, credentials);
		return this.get(key);
	}

	/**
	 * Set a token entry using credential-based key generation
	 */
	setByCredentials(credentialType: string, credentials: any, entry: TokenCacheEntry): void {
		const key = this.generateKey(credentialType, credentials);
		this.set(key, entry);
	}

	/**
	 * Delete a token entry using credential-based key generation
	 */
	deleteByCredentials(credentialType: string, credentials: any): boolean {
		const key = this.generateKey(credentialType, credentials);
		return this.delete(key);
	}

	/**
	 * Check if credentials have a valid cached token
	 */
	hasByCredentials(credentialType: string, credentials: any): boolean {
		const key = this.generateKey(credentialType, credentials);
		return this.has(key);
	}

	/**
	 * Create a cache entry with OAuth2 token using credential-specific configuration
	 */
	createOAuthEntry(
		credentialType: string,
		token: string,
		expiresInSeconds: number,
	): TokenCacheEntry {
		const config = this.getCacheConfig(credentialType);
		const now = Date.now();
		const expiresIn = Math.max(expiresInSeconds * 1000, config.minCacheDuration);
		const expiryTime = now + expiresIn - config.bufferTime;

		return {
			token,
			expires: expiryTime,
			type: 'oauth',
		};
	}

	/**
	 * Create a cache entry with Basic Auth using credential-specific configuration
	 */
	createBasicAuthEntry(credentialType: string, token: string): TokenCacheEntry {
		const config = this.getCacheConfig(credentialType);
		const now = Date.now();

		return {
			token,
			expires: now + config.defaultTokenExpiry,
			type: 'basic',
		};
	}

	/**
	 * Get a cached token entry, automatically removing expired entries
	 */
	get(key: string): TokenCacheEntry | undefined {
		const entry = this.cache.get(key);
		if (entry && entry.expires <= Date.now()) {
			this.cache.delete(key);
			return undefined;
		}
		return entry;
	}

	/**
	 * Set a token entry in the cache
	 */
	set(key: string, entry: TokenCacheEntry): void {
		this.cache.set(key, entry);
	}

	/**
	 * Delete a specific token entry from the cache
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all cached tokens
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get the current size of the cache
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Check if a key exists and is not expired
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;

		if (entry.expires <= Date.now()) {
			this.cache.delete(key);
			return false;
		}
		return true;
	}

	/**
	 * Get all cache keys (useful for debugging)
	 */
	keys(): string[] {
		return Array.from(this.cache.keys());
	}

	/**
	 * Start automatic cleanup of expired tokens
	 */
	private startCleanupInterval(): void {
		// Clear any existing interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredTokens();
		}, 300000); // Clean up every 5 minutes

		// Cleanup on process exit if available
		if (typeof process !== 'undefined' && process.on) {
			process.on('beforeExit', () => {
				this.stopCleanupInterval();
			});
		}
	}

	/**
	 * Stop the automatic cleanup interval
	 */
	private stopCleanupInterval(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}

	/**
	 * Remove all expired tokens from the cache
	 */
	private cleanupExpiredTokens(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (entry.expires <= now) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Manually cleanup expired tokens (useful for testing or immediate cleanup)
	 */
	cleanupNow(): void {
		this.cleanupExpiredTokens();
	}

	/**
	 * Get statistics about the current cache state
	 */
	getStats(): {
		total: number;
		expired: number;
		active: number;
		types: Record<string, number>;
	} {
		const now = Date.now();
		let expired = 0;
		let active = 0;
		const types: Record<string, number> = {};

		for (const [, entry] of this.cache.entries()) {
			if (entry.expires <= now) {
				expired++;
			} else {
				active++;
			}

			types[entry.type] = (types[entry.type] || 0) + 1;
		}

		return {
			total: this.cache.size,
			expired,
			active,
			types,
		};
	}

	/**
	 * Reset the singleton instance (useful for testing)
	 */
	static reset(): void {
		if (TokenCacheManager.instance) {
			TokenCacheManager.instance.stopCleanupInterval();
			TokenCacheManager.instance.clear();
			TokenCacheManager.instance = undefined as any;
		}
	}
}
