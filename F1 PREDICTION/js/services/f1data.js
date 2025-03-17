const fastf1 = require('fastf1');
const { LiveF1Client } = require('livef1');

export class F1DataService {
    constructor() {
        this.drivers2025 = [
            { name: 'Max Verstappen', team: 'Red Bull Racing' },
            { name: 'Liam Lawson', team: 'Red Bull Racing' },
            { name: 'Lewis Hamilton', team: 'Ferrari' },
            { name: 'Charles Leclerc', team: 'Ferrari' },
            { name: 'George Russell', team: 'Mercedes' },
            { name: 'Andrea Kimi Antonelli', team: 'Mercedes' },
            { name: 'Lando Norris', team: 'McLaren' },
            { name: 'Oscar Piastri', team: 'McLaren' },
            { name: 'Fernando Alonso', team: 'Aston Martin' },
            { name: 'Lance Stroll', team: 'Aston Martin' },
            { name: 'Pierre Gasly', team: 'Alpine' },
            { name: 'Jack Doohan', team: 'Alpine' },
            { name: 'Esteban Ocon', team: 'Haas F1' },
            { name: 'Oliver Bearman', team: 'Haas F1' },
            { name: 'Carlos Sainz Jr.', team: 'Williams' },
            { name: 'Alexander Albon', team: 'Williams' },
            { name: 'Nico Hülkenberg', team: 'Sauber' },
            { name: 'Gabriel Bortoleto', team: 'Sauber' },
            { name: 'Isack Hadjar', team: 'Racing Bulls' },
            { name: 'Yuki Tsunoda', team: 'Racing Bulls' }
        ];

        this.tracks2025 = [
            { name: 'Melbourne Grand Prix Circuit', country: 'Australia' },
            { name: 'Shanghai International Circuit', country: 'Cina' },
            { name: 'Suzuka International Racing Course', country: 'Giappone' },
            { name: 'Bahrain International Circuit', country: 'Bahrain' },
            { name: 'Jeddah Street Circuit', country: 'Arabia Saudita' },
            { name: 'Miami International Autodrome', country: 'Stati Uniti' },
            { name: 'Imola Circuit', country: 'Italia' },
            { name: 'Circuit de Monaco', country: 'Monaco' },
            { name: 'Circuit de Barcelona-Catalunya', country: 'Spagna' },
            { name: 'Circuit Gilles Villeneuve', country: 'Canada' },
            { name: 'Red Bull Ring', country: 'Austria' },
            { name: 'Silverstone Circuit', country: 'Regno Unito' },
            { name: 'Circuit de Spa-Francorchamps', country: 'Belgio' },
            { name: 'Hungaroring', country: 'Ungheria' },
            { name: 'Circuit Zandvoort', country: 'Paesi Bassi' },
            { name: 'Monza Circuit', country: 'Italia' },
            { name: 'Baku City Circuit', country: 'Azerbaigian' },
            { name: 'Marina Bay Street Circuit', country: 'Singapore' },
            { name: 'Circuit of the Americas', country: 'Stati Uniti' },
            { name: 'Autódromo Hermanos Rodríguez', country: 'Messico' },
            { name: 'Interlagos Circuit', country: 'Brasile' },
            { name: 'Las Vegas Street Circuit', country: 'Stati Uniti' },
            { name: 'Losail International Circuit', country: 'Qatar' },
            { name: 'Yas Marina Circuit', country: 'Abu Dhabi' }
        ];
    }

    async initialize() {
        try {
            // Using Ergast API instead of FastF1
            await this.fetchErgastData();
            await this.fetchWeatherData();
            console.log('F1 APIs initialized successfully');
        } catch (error) {
            console.error('API initialization error:', error);
            throw error;
        }
    }

    async fetchErgastData() {
        const response = await fetch('https://ergast.com/api/f1/current/last/results.json');
        return await response.json();
    }

    async fetchWeatherData() {
        // Using OpenWeather API for race location weather
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${this.getCurrentGP()}&appid=4006e949ffb02a31ae254a53e3f3f8ea`);
        return await response.json();
    }

    async getNextRaceData() {
        try {
            const [ergastData, weatherData] = await Promise.all([
                this.fetchErgastData(),
                this.fetchWeatherData()
            ]);

            return {
                nextRace: this.getCurrentRaceInfo(),
                weather: this.parseWeatherData(weatherData),
                currentDrivers: this.parseDriverData(ergastData),
                trackConditions: this.calculateTrackConditions(weatherData)
            };
        } catch (error) {
            console.error('Error fetching race data:', error);
            throw error;
        }
    }

    async getHistoricalData(track, season) {
        // Implementation for fetching historical data
    }

    async connectToLiveF1API() {
        this.liveF1Client = new LiveF1Client({
            hostname: 'livetiming.formula1.com',
            port: 2000
        });
        await this.liveF1Client.connect();
    }

    async connectToFastF1API() {
        this.fastf1Session = await fastf1.get_session(
            this.getCurrentYear(),
            this.getCurrentGP(),
            'FP1'  // Default to FP1, will be updated as needed
        );
        await this.fastf1Session.load();
    }

    async getPracticeData(sessionType) {
        try {
            const fastf1Data = await this.getFastF1PracticeData(sessionType);
            const liveF1Data = await this.getLiveF1PracticeData(sessionType);
            
            return this.mergePracticeData(fastf1Data, liveF1Data);
        } catch (error) {
            console.error(`Error fetching ${sessionType} data:`, error);
            return null;
        }
    }

    async getFastF1PracticeData(sessionType) {
        try {
            const session = await fastf1.get_session(
                this.getCurrentYear(),
                this.getCurrentGP(),
                sessionType
            );
            await session.load();

            return {
                lapTimes: await session.laps.get_driver_laps(),
                telemetry: await session.load_telemetry(),
                weather: await session.weather_data,
                tireData: await session.car_data,
                events: await session.events
            };
        } catch (error) {
            console.error(`Error loading ${sessionType} data:`, error);
            throw error;
        }
    }

    async getLiveF1PracticeData(sessionType) {
        const client = new LiveF1Client();
        await client.connect();
        return {
            realTimeData: await client.getCurrentSessionData(),
            timingData: await client.getTimingData(),
            carStatus: await client.getCarStatus()
        };
    }

    mergePracticeData(fastf1Data, liveF1Data) {
        return {
            sessionAnalysis: {
                fastestLaps: this.analyzeFastestLaps(fastf1Data),
                longRuns: this.analyzeLongRuns(fastf1Data),
                tirePerformance: this.analyzeTirePerformance(fastf1Data),
                realTimePerformance: this.analyzeRealTimeData(liveF1Data)
            },
            conditions: {
                track: fastf1Data.weather,
                tires: fastf1Data.tireData,
                realTime: liveF1Data.carStatus
            }
        };
    }

    async getDriversCurrentStatus() {
        try {
            const driverStatus = await this.liveF1Client.getDriverList();
            const fastf1Data = await this.fastf1Session.laps.get_driver_laps();
            
            return this.drivers2025.map(driver => ({
                ...driver,
                recentForm: this.calculateDriverForm(driver.name, fastf1Data),
                qualification: this.getQualifyingPosition(driver.name, driverStatus),
                lastLapTime: this.getLastLapTime(driver.name, driverStatus),
                sector1Time: this.getSectorTime(driver.name, 1),
                sector2Time: this.getSectorTime(driver.name, 2),
                sector3Time: this.getSectorTime(driver.name, 3),
                tyreAge: this.getTyreAge(driver.name, driverStatus),
                tyreCompound: this.getTyreCompound(driver.name, driverStatus)
            }));
        } catch (error) {
            console.error('Error fetching driver status:', error);
            throw error;
        }
    }

    getCurrentYear() {
        return 2025;
    }

    getCurrentGP() {
        return this.tracks2025[0].name;
    }

    analyzeFastestLaps(data) {
        return data?.lapTimes ? 
            Object.fromEntries(
                this.drivers2025.map(d => [d.name, Math.random()])
            ) : {};
    }

    analyzeLongRuns(data) {
        return data?.lapTimes ? 
            Object.fromEntries(
                this.drivers2025.map(d => [d.name, Math.random()])
            ) : {};
    }

    analyzeTirePerformance(data) {
        return data?.tireData ? 
            Object.fromEntries(
                this.drivers2025.map(d => [d.name, Math.random()])
            ) : {};
    }

    analyzeRealTimeData(data) {
        return data?.realTimeData ? 
            Object.fromEntries(
                this.drivers2025.map(d => [d.name, Math.random()])
            ) : {};
    }

    calculateDriverForm(driverName, fastf1Data) {
        const recentLaps = fastf1Data.filter(lap => lap.driver === driverName)
            .slice(-5);  // Last 5 laps
        
        if (recentLaps.length === 0) return 0.5;

        const averageLapTime = recentLaps.reduce((sum, lap) => sum + lap.laptime, 0) / recentLaps.length;
        const fastestLap = Math.min(...recentLaps.map(lap => lap.laptime));
        
        return 1 - (averageLapTime - fastestLap) / averageLapTime;
    }

    // ... other helper methods remain unchanged
}
