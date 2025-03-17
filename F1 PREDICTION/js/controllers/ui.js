export class UIController {
    constructor() {
        this.charts = {};
        this.initializeCharts();
    }

    initializeCharts() {
        const ctx = document.getElementById('predictionChart').getContext('2d');
        this.charts.predictions = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Race Predictions' }
                }
            }
        });
    }

    updatePredictionDisplay(predictions) {
        document.getElementById('winner-prediction').innerHTML = this.createWinnerHTML(predictions.winner);
        document.getElementById('finishing-order').innerHTML = this.createFinishingOrderHTML(predictions.finishingOrder);
        document.getElementById('accuracy-index').innerHTML = this.createAccuracyHTML(predictions.accuracyIndex);
        this.updatePredictionChart(predictions);
    }

    updateBettingDisplay(bettingInsights) {
        const oddsDisplay = document.getElementById('odds-display');
        const factorsDisplay = document.getElementById('factors-analysis');

        try {
            oddsDisplay.innerHTML = this.createLoadingHTML();
            this.renderBettingData(bettingInsights, oddsDisplay, factorsDisplay);
        } catch (error) {
            oddsDisplay.innerHTML = this.createErrorHTML(error);
        }
    }

    async renderBettingData(bettingInsights, oddsDisplay, factorsDisplay) {
        try {
            const html = await this.createOddsHTML(bettingInsights.recommendedBets);
            oddsDisplay.innerHTML = html || this.createNoOddsHTML();
            factorsDisplay.innerHTML = this.createFactorsHTML(bettingInsights.riskAnalysis);
        } catch (error) {
            oddsDisplay.innerHTML = this.createErrorHTML(error);
        }
    }

    updatePredictionChart(predictions) {
        // Update chart with new prediction data
        this.charts.predictions.data.labels = predictions.finishingOrder.map(d => d.name);
        this.charts.predictions.data.datasets = [{
            label: 'Win Probability',
            data: predictions.finishingOrder.map(d => d.confidence * 100)
        }];
        this.charts.predictions.update();
    }

    createOddsHTML(bets) {
        return `
            <div class="betting-odds">
                <h3>Recommended Bets</h3>
                ${bets.map(bet => `
                    <div class="bet-card">
                        <h4>${bet.driver}</h4>
                        <p>Confidence: ${(bet.confidence * 100).toFixed(2)}%</p>
                        <p>Best Odds: ${bet.bestOdds.bookmaker} (${bet.bestOdds.odds.price})</p>
                        <p>Expected Value: ${bet.expectedValue.toFixed(2)}</p>
                        <p>Bet Type: ${bet.betType}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    createLoadingHTML() {
        return '<div class="loading">Loading betting odds...</div>';
    }

    createErrorHTML(error) {
        return `<div class="error">Unable to load odds: ${error.message}</div>`;
    }

    createNoOddsHTML() {
        return '<div class="no-odds">No betting odds currently available</div>';
    }

    createWinnerHTML(winner) {
        return `
            <div class="prediction-winner">
                <h3>Predicted Winner</h3>
                <div class="winner-card">
                    <h4>${winner.name}</h4>
                    <p>Team: ${winner.team}</p>
                    <p>Win Probability: ${(winner.score * 100).toFixed(2)}%</p>
                </div>
            </div>
        `;
    }

    createFinishingOrderHTML(order) {
        return `
            <div class="finishing-order">
                <h3>Predicted Finishing Order</h3>
                <div class="order-list">
                    ${order.map((driver, index) => `
                        <div class="position-card">
                            <span class="position">${index + 1}</span>
                            <span class="driver">${driver.name}</span>
                            <span class="confidence">${(driver.confidence * 100).toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createAccuracyHTML(accuracy) {
        const accuracyPercent = (accuracy * 100).toFixed(1);
        const accuracyClass = accuracy > 0.7 ? 'high' : accuracy > 0.5 ? 'medium' : 'low';
        
        return `
            <div class="accuracy-indicator ${accuracyClass}">
                <h3>Prediction Accuracy</h3>
                <div class="accuracy-value">${accuracyPercent}%</div>
                <div class="accuracy-bar">
                    <div class="bar-fill" style="width: ${accuracyPercent}%"></div>
                </div>
            </div>
        `;
    }

    createFactorsHTML(riskAnalysis) {
        return `
            <div class="risk-analysis">
                <h3>Risk Factors</h3>
                <div class="risk-factors">
                    <div class="risk-factor">
                        <h4>Weather Risk</h4>
                        <div class="risk-level ${this.getRiskClass(riskAnalysis.weather)}">${riskAnalysis.weather}</div>
                    </div>
                    <div class="risk-factor">
                        <h4>Technical Risk</h4>
                        <div class="risk-level ${this.getRiskClass(riskAnalysis.technical)}">${riskAnalysis.technical}</div>
                    </div>
                    <div class="risk-factor">
                        <h4>Strategic Risk</h4>
                        <div class="risk-level ${this.getRiskClass(riskAnalysis.strategic)}">${riskAnalysis.strategic}</div>
                    </div>
                </div>
            </div>
        `;
    }

    getRiskClass(risk) {
        return risk < 0.3 ? 'low' : risk < 0.7 ? 'medium' : 'high';
    }

    setupNavigation() {
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.showSection(targetId);
                this.updateActiveNavLink(link);
            });
        });
        // Show initial section
        this.showSection('race-predictions');
    }

    updateActiveNavLink(activeLink) {
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    showSection(sectionId) {
        document.querySelectorAll('main > section').forEach(section => {
            section.classList.toggle('hidden', section.id !== sectionId);
        });
    }
}
