import { F1DataService } from './services/f1data.js';
import { PredictionEngine } from './services/predictions.js';
import { BettingAnalyzer } from './services/betting.js';
import { UIController } from './controllers/ui.js';

class App {
    constructor() {
        this.dataService = new F1DataService();
        this.predictionEngine = new PredictionEngine();
        this.bettingAnalyzer = new BettingAnalyzer();
        this.ui = new UIController();
        this.initialized = false;
        this.showStatus('Initializing application...');
    }

    async init() {
        try {
            this.showStatus('Connecting to F1 APIs...');
            await this.dataService.initialize();
            
            this.showStatus('Setting up interface...');
            this.setupEventListeners();
            
            this.showStatus('Loading initial data...');
            await this.updatePredictions();
            
            this.initialized = true;
            this.hideStatus();
        } catch (error) {
            this.showError('Initialization failed: ' + error.message);
            console.error('Initialization error:', error);
        }
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.ui.setupNavigation();
            this.updateUI();
        });
    }

    updateUI() {
        this.updatePredictions();
        this.ui.showSection('race-predictions');
    }

    showStatus(message) {
        const overlay = document.getElementById('status-overlay');
        const text = document.getElementById('status-text');
        text.textContent = message;
        overlay.classList.remove('hidden');
    }

    hideStatus() {
        document.getElementById('status-overlay').classList.add('hidden');
    }

    showError(message) {
        this.showStatus(message);
        document.getElementById('status-overlay').classList.add('error');
    }

    async updatePredictions() {
        try {
            const raceData = await this.dataService.getNextRaceData();
            if (!raceData) throw new Error('No race data available');

            this.showStatus('Loading practice data...');
            const practiceData = {
                fp1Data: await this.dataService.getPracticeData('FP1'),
                fp2Data: await this.dataService.getPracticeData('FP2'),
                fp3Data: await this.dataService.getPracticeData('FP3')
            };

            this.showStatus('Generating predictions...');
            const predictions = await this.predictionEngine.generatePredictions({
                ...raceData,
                ...practiceData
            });

            this.showStatus('Analyzing betting data...');
            const bettingInsights = await this.bettingAnalyzer.analyzeBettingFactors({
                ...raceData,
                ...practiceData
            });
            
            await this.ui.updatePredictionDisplay(predictions);
            await this.ui.updateBettingDisplay(bettingInsights);
        } catch (error) {
            this.showError('Failed to update predictions: ' + error.message);
            console.error('Update error:', error);
        }
    }

    async monitorPracticeSession(sessionType) {
        const practiceData = await this.dataService.getPracticeData(sessionType);
        if (practiceData) {
            this.updatePredictions();
        }
    }
}

const app = new App();
app.init();
