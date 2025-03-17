import { CacheService } from './cache-service.js';

export class PredictionEngine {
    constructor() {
        this.accuracyThreshold = 0.75;
        this.weatherWeight = 0.3;
        this.historicalWeight = 0.4;
        this.currentFormWeight = 0.3;
        this.cache = new CacheService();
        this.confidenceThresholds = {
            highConfidence: 0.85,
            mediumConfidence: 0.65,
            lowConfidence: 0.45
        };
    }

    async generatePredictions(raceData) {
        const cacheKey = `predictions_${raceData.nextRace.name}`;
        const cached = this.cache.getCached(cacheKey);
        if (cached) return cached;

        const predictions = {
            winner: await this.predictWinner(raceData),
            finishingOrder: await this.predictFinishingOrder(raceData),
            accuracyIndex: await this.calculateAccuracyIndex(raceData),
            confidenceMetrics: await this.calculateConfidenceMetrics(raceData)
        };

        this.cache.setCached(cacheKey, predictions, 'predictions');
        return predictions;
    }

    async predictWinner(raceData) {
        const scores = await this.calculateDriverScores(raceData);
        return scores.sort((a, b) => b.score - a.score)[0];
    }

    async predictFinishingOrder(raceData) {
        return (await this.calculateDriverScores(raceData))
            .sort((a, b) => b.score - a.score)
            .map(driver => ({
                position: driver.position,
                name: driver.name,
                confidence: driver.score
            }));
    }

    async calculateAccuracyIndex(raceData) {
        const factors = {
            weatherReliability: this.analyzeWeatherReliability(raceData),
            historicalAccuracy: this.analyzeHistoricalAccuracy(raceData),
            dataQuality: this.assessDataQuality(raceData)
        };
        
        return (factors.weatherReliability + factors.historicalAccuracy + factors.dataQuality) / 3;
    }

    async analyzePracticePerformance(fp1Data, fp2Data, fp3Data) {
        const practiceAnalysis = {
            fp1Score: this.calculateSessionScore(fp1Data, 0.2),
            fp2Score: this.calculateSessionScore(fp2Data, 0.3),
            fp3Score: this.calculateSessionScore(fp3Data, 0.5)
        };

        return {
            sessionScores: practiceAnalysis,
            aggregateScore: this.calculateAggregateScore(practiceAnalysis),
            performanceTrends: this.analyzeTrends([fp1Data, fp2Data, fp3Data])
        };
    }

    calculateSessionScore(sessionData, weight) {
        if (!sessionData) return 0;

        const metrics = {
            fastLapScore: this.evaluateFastLaps(sessionData.sessionAnalysis.fastestLaps),
            raceSimScore: this.evaluateLongRuns(sessionData.sessionAnalysis.longRuns),
            tireManagement: this.evaluateTirePerformance(sessionData.sessionAnalysis.tirePerformance),
            trackEvolution: this.evaluateTrackEvolution(sessionData.conditions)
        };

        return Object.values(metrics).reduce((sum, score) => sum + score, 0) * weight;
    }

    analyzeTrends(sessionsData) {
        return {
            performance: this.calculatePerformanceTrend(sessionsData),
            reliability: this.calculateReliabilityTrend(sessionsData),
            tireManagement: this.calculateTireManagementTrend(sessionsData)
        };
    }

    async calculateDriverScores(raceData) {
        const historicalPerformance = await this.analyzeHistoricalPerformance(raceData);
        const practicePerformance = await this.analyzePracticeData(raceData);
        const weatherImpact = await this.analyzeWeatherImpact(raceData);
        const trackSpecificStats = await this.analyzeTrackSpecificPerformance(raceData);

        return Promise.all(raceData.currentDrivers.map(async driver => {
            const scores = {
                historical: await this.calculateHistoricalScore(driver, historicalPerformance),
                practice: this.calculatePracticeScore(driver, practicePerformance),
                weather: this.calculateWeatherScore(driver, weatherImpact, raceData.weather),
                trackSpecific: await this.calculateTrackScore(driver, trackSpecificStats),
                recentForm: this.calculateRecentForm(driver),
                qualifying: this.normalizeQualifyingPosition(driver.qualification)
            };

            const reliability = await this.calculateReliabilityScore(driver);
            const teamPerformance = await this.calculateTeamPerformance(driver.team);
            const strategyEfficiency = this.calculateStrategyEfficiency(driver, raceData);

            return {
                name: driver.name,
                team: driver.team,
                score: this.computeFinalScore(scores, reliability, teamPerformance, strategyEfficiency),
                confidence: this.calculateConfidence(scores),
                metrics: { ...scores, reliability, teamPerformance, strategyEfficiency }
            };
        }));
    }

    calculateHistoricalScore(driver, historicalData) {
        const weights = {
            lastRace: 0.3,
            lastThreeRaces: 0.3,
            seasonPerformance: 0.2,
            trackHistory: 0.2
        };

        const lastRacePerf = historicalData.lastRaceResult[driver.name] || 0.5;
        const lastThreeAvg = historicalData.lastThreeRaces[driver.name] || 0.5;
        const seasonPerf = historicalData.seasonPerformance[driver.name] || 0.5;
        const trackHist = historicalData.trackHistory[driver.name] || 0.5;

        return (lastRacePerf * weights.lastRace) +
               (lastThreeAvg * weights.lastThreeRaces) +
               (seasonPerf * weights.seasonPerformance) +
               (trackHist * weights.trackHistory);
    }

    calculatePracticeScore(driver, practiceData) {
        const fpWeights = { fp1: 0.2, fp2: 0.3, fp3: 0.5 };
        const metrics = {
            lapTime: 0.4,
            consistency: 0.3,
            tireManagement: 0.3
        };

        let totalScore = 0;
        for (const [session, weight] of Object.entries(fpWeights)) {
            const sessionData = practiceData[session];
            if (!sessionData) continue;

            const lapTimeScore = this.normalizeLapTimes(sessionData.lapTimes[driver.name]);
            const consistencyScore = this.calculateConsistencyScore(sessionData.lapTimes[driver.name]);
            const tireScore = this.calculateTireManagementScore(sessionData.tireData[driver.name]);

            totalScore += weight * (
                (lapTimeScore * metrics.lapTime) +
                (consistencyScore * metrics.consistency) +
                (tireScore * metrics.tireManagement)
            );
        }

        return totalScore;
    }

    calculateWeatherScore(driver, weatherImpact, currentWeather) {
        const wetPerformance = weatherImpact.wetRacePerformance[driver.name] || 0.5;
        const tempSensitivity = weatherImpact.temperatureSensitivity[driver.name] || 0.5;
        
        const rainProb = currentWeather.rainChance / 100;
        const tempFactor = this.normalizeTemperature(currentWeather.temperature);

        return (wetPerformance * rainProb) + 
               (tempSensitivity * tempFactor) * (1 - rainProb);
    }

    computeFinalScore(scores, reliability, teamPerformance, strategyEfficiency) {
        const baseScore = this.weightedAverage(scores);
        const performanceModifier = (reliability + teamPerformance + strategyEfficiency) / 3;
        
        // Apply nonlinear scaling to emphasize small differences
        return Math.pow(baseScore * performanceModifier, 1.5);
    }

    calculateReliabilityScore(driver) {
        const weights = {
            technicalDNFs: 0.4,
            componentLife: 0.3,
            consistencyRate: 0.3
        };

        // Calculate each factor and return weighted average
        const technicalDNFScore = 1 - (driver.technicalDNFs || 0) / 3; // Last 3 races
        const componentLifeScore = this.calculateComponentLifeScore(driver);
        const consistencyScore = driver.consistencyRate || 0.5;

        return (technicalDNFScore * weights.technicalDNFs) +
               (componentLifeScore * weights.componentLife) +
               (consistencyScore * weights.consistencyRate);
    }

    // Helper methods for calculations
    normalizePosition(position, totalDrivers = 20) {
        return 1 - ((position - 1) / (totalDrivers - 1));
    }

    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squareDiffs = values.map(val => Math.pow(val - mean, 2));
        return squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }

    normalizeLapTimes(lapTimes) {
        if (!lapTimes || lapTimes.length === 0) return 0.5;
        const fastestLap = Math.min(...lapTimes);
        const averageLap = lapTimes.reduce((sum, time) => sum + time, 0) / lapTimes.length;
        return 1 - ((averageLap - fastestLap) / fastestLap);
    }

    async analyzeHistoricalPerformance(raceData) {
        const cacheKey = `historical_${raceData.nextRace.name}`;
        const cached = this.cache.getCached(cacheKey);
        if (cached) return cached;

        const lastRaces = await this.getLastNRaces(5);
        const trackHistory = await this.getTrackHistory(raceData.nextRace.name, 3);
        
        const performance = {};
        for (const driver of raceData.currentDrivers) {
            performance[driver.name] = this.calculateHistoricalScore(
                driver,
                lastRaces,
                trackHistory
            );
        }

        this.cache.setCached(cacheKey, performance, 'historicalData');
        return performance;
    }

    weightedAverage(scores) {
        const weights = {
            historical: 0.2,
            practice: 0.25,
            weather: 0.15,
            trackSpecific: 0.15,
            recentForm: 0.15,
            qualifying: 0.1
        };

        return Object.entries(scores).reduce(
            (sum, [key, value]) => sum + (value * weights[key]),
            0
        );
    }

    calculateConfidence(scores) {
        const variance = this.calculateVariance(Object.values(scores));
        const consistency = 1 - Math.sqrt(variance);
        const dataQuality = this.assessDataQuality(scores);
        
        return (consistency + dataQuality) / 2;
    }

    calculateScore(driver, raceData) {
        const baseScore = Math.random(); // Replace with actual calculation
        const weatherImpact = this.weatherWeight * Math.random();
        const historyImpact = this.historicalWeight * Math.random();
        const formImpact = this.currentFormWeight * driver.recentForm;
        
        return (baseScore + weatherImpact + historyImpact + formImpact) / 4;
    }

    analyzeWeatherReliability(raceData) {
        return raceData?.weather ? Math.random() : 0.5;
    }

    analyzeHistoricalAccuracy(raceData) {
        return Math.random();
    }

    assessDataQuality(raceData) {
        return raceData ? Math.random() : 0.5;
    }

    calculateAggregateScore(analysis) {
        if (!analysis) return 0;
        const scores = Object.values(analysis);
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
}
