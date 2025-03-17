import { OddsAPIService } from './odds-api.js';

export class BettingAnalyzer {
    constructor() {
        this.confidenceThreshold = 0.7;
        this.oddsService = new OddsAPIService();
        this.cache = new CacheService();
        this.valueThreshold = 1.1;
    }

    async analyzeBettingFactors(raceData) {
        const cacheKey = `betting_${raceData.nextRace.name}`;
        const cached = this.cache.getCached(cacheKey);
        if (cached) return cached;

        const marketOdds = await this.oddsService.getF1Odds();
        const analysis = {
            recommendedBets: await this.generateRecommendedBets(raceData, marketOdds),
            riskAnalysis: await this.analyzeRisks(raceData),
            valueOpportunities: await this.findValueBets(raceData, marketOdds),
            marketAnalysis: this.analyzeMarketEfficiency(marketOdds)
        };

        this.cache.setCached(cacheKey, analysis, 'predictions');
        return analysis;
    }

    async generateRecommendedBets(raceData, marketOdds) {
        if (!marketOdds) {
            console.warn('Market odds not available');
            return [];
        }

        const opportunities = [];
        const drivers = await this.analyzeDriverProbabilities(raceData);
        
        for (const driver of drivers) {
            try {
                const marketOddsForDriver = await this.oddsService.getDriverOdds(driver.name);
                if (!marketOddsForDriver?.length) continue;

                const expectedValue = this.calculateExpectedValue(driver, marketOddsForDriver);
                if (this.hasPositiveExpectedValue(expectedValue)) {
                    opportunities.push({
                        driver: driver.name,
                        betType: this.determineBetType(driver),
                        confidence: driver.probability,
                        expectedValue,
                        bestOdds: this.findBestOdds(marketOddsForDriver)
                    });
                }
            } catch (error) {
                console.error(`Error processing odds for ${driver.name}:`, error);
                continue;
            }
        }
        
        return opportunities;
    }

    async analyzeDriverProbabilities(raceData) {
        return raceData.currentDrivers.map(driver => ({
            name: driver.name,
            probability: Math.random(),
            form: driver.recentForm
        }));
    }

    hasPositiveExpectedValue(expectedValue) {
        return expectedValue > 1.1;
    }

    calculateExpectedValue(driver, odds) {
        if (!odds?.length) return 0;
        const bestOdds = Math.max(...odds.map(o => o.odds.price));
        return driver.probability * bestOdds;
    }

    determineBetType(driver) {
        return driver.probability > 0.5 ? 'Win' : 'Place';
    }

    analyzeRisks(raceData) {
        return {
            weather: this.assessWeatherRisk(raceData),
            technical: this.assessTechnicalRisk(raceData),
            strategic: this.assessStrategicRisk(raceData)
        };
    }

    assessWeatherRisk(raceData) {
        return raceData?.weather?.rainChance / 100 || 0.5;
    }

    assessTechnicalRisk(raceData) {
        return Math.random();
    }

    assessStrategicRisk(raceData) {
        return Math.random();
    }

    findBestOdds(marketOdds) {
        return marketOdds.reduce((best, current) => 
            (current.odds.price > best.odds.price) ? current : best
        );
    }

    async findValueBets(raceData, marketOdds) {
        const predictions = await this.getPredictedProbabilities(raceData);
        const valueOpportunities = [];

        for (const driver of raceData.currentDrivers) {
            const driverOdds = await this.oddsService.getDriverOdds(driver.name);
            const bestOdds = this.findBestOdds(driverOdds);
            const predictedProb = predictions[driver.name];
            
            if (this.hasValue(predictedProb, bestOdds)) {
                valueOpportunities.push({
                    driver: driver.name,
                    predictedProbability: predictedProb,
                    marketOdds: bestOdds,
                    valueRatio: this.calculateValueRatio(predictedProb, bestOdds),
                    confidence: this.calculateBetConfidence(predictedProb, bestOdds)
                });
            }
        }

        return valueOpportunities.sort((a, b) => b.valueRatio - a.valueRatio);
    }
}
