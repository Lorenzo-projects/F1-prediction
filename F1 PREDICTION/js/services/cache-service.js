export class CacheService {
    constructor() {
        this.cache = new Map();
        this.expirations = {
            raceData: 60 * 60 * 1000, // 1 hour
            practiceData: 30 * 60 * 1000, // 30 minutes
            historicalData: 24 * 60 * 60 * 1000, // 24 hours
            predictions: 15 * 60 * 1000 // 15 minutes
        };
    }

    setCached(key, data, type) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiration: this.expirations[type]
        });
    }

    getCached(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.expiration) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    invalidateCache(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}
