class WeatherService {
  constructor(app, settings, debug) {
    this.app = app;
    this.settings = settings;
    this.debug = debug;
    this.updateTimer = null;
    this.currentWeatherData = {};
    this.lastUpdate = null;

    // Debug: Log the actual settings received by WeatherService
    this.debug('WeatherService received settings:', JSON.stringify(settings, null, 2));

    // Initialize SignalK client for vessel data
    const SignalKClient = require('./signalk-client');
    this.signalkClient = new SignalKClient(app, debug);

    // Initialize AccuWeather service for API calls
    const AccuWeatherService = require('./accuweather-service');
    this.accuWeatherService = new AccuWeatherService(settings, debug);

    // Initialize wind calculator for proper vector calculations
    const WindCalculator = require('./wind-calculator');
    this.windCalculator = new WindCalculator(debug);
  }

  start() {
    this.debug('WeatherService starting');

    // Start periodic weather updates based on configured frequency
    const updateInterval = (this.settings.updateFrequency || 5) * 60 * 1000; // Convert minutes to milliseconds

    // Set up periodic updates for AccuWeather data
    this.updateTimer = setInterval(() => {
      this.updateWeatherData();
    }, updateInterval);

    this.debug('WeatherService started with update interval:', updateInterval / 1000, 'seconds');
  }

  stop() {
    this.debug('WeatherService stopping');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.currentWeatherData = {};
    this.lastUpdate = null;

    this.debug('WeatherService stopped');
  }

  getCurrentWeatherData() {
    return this.currentWeatherData;
  }

  async updateWeatherData() {
    this.debug('Updating weather data...');

    try {
      // Get vessel position or use manual coordinates
      const position = this.getPosition();
      if (!position) {
        this.debug('No position available for weather data');
        return;
      }

      // Get weather data from AccuWeather
      const weatherData = await this.accuWeatherService.fetchCurrentWeather(position);

      if (weatherData) {
        // Get vessel data for wind calculations
        const vesselData = this.getVesselData();

        // Calculate enhanced weather values using proper wind calculator
        // Only calculate apparent wind if we have complete vessel data
        let apparentWindSpeed = null;
        let apparentWindAngle = null;

        if (vesselData.isComplete) {
          this.debug('Calculating apparent wind with complete vessel data:', {
            windSpeed: weatherData.windSpeed,
            vesselSpeed: vesselData.speedOverGround,
            vesselCourse: vesselData.courseOverGround,
            windDirection: weatherData.windDirection,
          });

          apparentWindSpeed = this.windCalculator.calculateApparentWindSpeed(
            weatherData.windSpeed,
            vesselData.speedOverGround,
            vesselData.courseOverGround,
            weatherData.windDirection
          );

          apparentWindAngle = this.windCalculator.calculateApparentWindAngle(
            weatherData.windSpeed,
            vesselData.speedOverGround,
            vesselData.courseOverGround,
            weatherData.windDirection
          );

          this.debug(
            `Apparent wind calculated: speed=${apparentWindSpeed} m/s, angle=${apparentWindAngle} rad (${((apparentWindAngle * 180) / Math.PI).toFixed(0)}°)`
          );
        } else {
          this.debug('Cannot calculate apparent wind - vessel data incomplete:', {
            hasPosition: !!vesselData.position,
            hasSpeed: typeof vesselData.speedOverGround === 'number',
            hasCourse: typeof vesselData.courseOverGround === 'number',
            vesselDataAge: vesselData.dataAge,
          });

          // Use true wind values as fallback
          apparentWindSpeed = weatherData.windSpeed;
          apparentWindAngle = 0; // Relative to bow when no vessel course available
          this.debug('Using fallback: apparent wind speed = true wind speed, angle = 0');
        }

        const windChill = this.windCalculator.calculateWindChill(
          weatherData.temperature,
          weatherData.windSpeed
        );

        const heatIndex = this.windCalculator.calculateHeatIndex(
          weatherData.temperature,
          weatherData.humidity
        );

        const dewPoint = this.windCalculator.calculateDewPoint(
          weatherData.temperature,
          weatherData.humidity
        );

        // Enhance weather data with calculated values
        this.currentWeatherData = {
          ...weatherData,
          apparentWindSpeed,
          apparentWindAngle,
          windChill,
          heatIndex,
          dewPoint,
        };

        this.lastUpdate = new Date();
        this.debug('Weather data updated successfully');
      } else {
        this.debug('No weather data received from APIs');
        // Keep using last known data
      }
    } catch (error) {
      this.debug('Error updating weather data:', error);
      // Keep last known data on error
    }
  }

  getPosition() {
    if (this.settings.useVesselPosition) {
      // Get position from SignalK navigation data using our client
      const position = this.signalkClient.getVesselPosition();
      if (position) {
        return {
          latitude: position.latitude,
          longitude: position.longitude,
        };
      }
    }

    // Use manual coordinates
    if (this.settings.manualLatitude && this.settings.manualLongitude) {
      return {
        latitude: this.settings.manualLatitude,
        longitude: this.settings.manualLongitude,
      };
    }

    return null;
  }

  // Mock weather data for testing plugin structure
  getMockWeatherData() {
    const vesselData = this.getVesselData();

    return {
      temperature: 288.15, // 15°C in Kelvin
      pressure: 101325, // Standard sea level pressure in Pascals
      humidity: 0.65, // 65% as ratio
      windSpeed: 5.14, // 10 knots in m/s
      windDirection: 1.57, // 90 degrees in radians (East)
      dewPoint: 283.15, // Calculated dew point in Kelvin
      windChill: 287.5, // Wind chill temperature in Kelvin
      heatIndex: 289.8, // Heat index in Kelvin
      apparentWindSpeed: this.windCalculator.calculateApparentWindSpeed(
        5.14,
        vesselData.speedOverGround,
        vesselData.courseOverGround,
        1.57
      ),
      apparentWindAngle: this.windCalculator.calculateApparentWindAngle(
        5.14,
        vesselData.speedOverGround,
        vesselData.courseOverGround,
        1.57
      ),
      lastUpdated: new Date().toISOString(),
    };
  }

  getVesselData() {
    // Use SignalK client for proper data retrieval with source filtering
    const vesselData = this.signalkClient.getVesselData();

    return {
      speedOverGround: vesselData.speedOverGround || 0,
      courseOverGround: vesselData.courseOverGroundTrue || 0,
      position: vesselData.position,
      isComplete: vesselData.isComplete,
      dataAge: vesselData.dataAge,
    };
  }
}

module.exports = WeatherService;
