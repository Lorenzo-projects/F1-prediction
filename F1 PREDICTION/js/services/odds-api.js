export class OddsAPIService {
    constructor() {
        this.apiKey = '74c2fb191c1bac606450bae503e0434b';
        this.baseUrl = 'https://api.the-odds-api.com/v4/sports';
        this.sport = 'motorsport_f1';
        this.requestsPerMinute = 10;
        this.requestQueue = [];
        this.cache = new Map();
        this.cacheExpiration = 5 * 60 * 1000; // 5 minutes
    }

    async getF1Odds() {
        const cacheKey = 'f1_odds';
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData) return cachedData;

        await this.checkRateLimit();
        try {
            const response = await fetch(
                `${this.baseUrl}/${this.sport}/odds/?apiKey=${this.apiKey}&regions=eu&markets=h2h,winner`
            );
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
                throw new Error('Failed to fetch odds');
            }
            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching odds:', error);
            throw error;
        }
    }

    async getDriverOdds(driverName) {
        const odds = await this.getF1Odds();
        return odds?.bookmakers.map(bookmaker => ({
            bookmaker: bookmaker.title,
            odds: bookmaker.markets
                .find(market => market.key === 'winner')
                ?.outcomes.find(outcome => outcome.name === driverName)
        })).filter(odd => odd.odds);
    }

    async checkRateLimit() {
        const now = Date.now();
        this.requestQueue = this.requestQueue.filter(time => time > now - 60000);
        if (this.requestQueue.length >= this.requestsPerMinute) {
            const oldestRequest = this.requestQueue[0];
            const waitTime = 60000 - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.requestQueue.push(now);
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}
