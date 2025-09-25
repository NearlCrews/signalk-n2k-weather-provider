const AccuWeatherClient = require('./accuweather-client');

/**
 * AccuWeather Service
 * Provides a simplified interface for AccuWeather weather data operations
 * Replaces the misleadingly named WeatherAggregator class
 */
class AccuWeatherService {
  constructor(settings, debug) {
    this.settings = settings;
    this.debug = debug || (() => {});
    this.accuWeatherClient = new AccuWeatherClient(settings.accuWeatherApiKey, debug);
  }

  /**
   * Fetch current weather data from AccuWeather API
   * @param {Object} position Position object with latitude/longitude
   * @returns {Promise<Object>} Weather data from AccuWeather
   */
  async fetchCurrentWeather(position) {
    if (
      !position ||
      typeof position.latitude !== 'number' ||
      typeof position.longitude !== 'number'
    ) {
      throw new Error('Invalid position provided for weather data');
    }

    if (!this.settings.accuWeatherApiKey) {
      throw new Error('AccuWeather API key not provided');
    }

    try {
      const weatherData = await this.accuWeatherClient.getCurrentWeather(
        position.latitude,
        position.longitude
      );

      this.debug('Successfully retrieved weather data from AccuWeather');
      return weatherData;
    } catch (error) {
      this.debug('AccuWeather API error:', error.message);
      throw error;
    }
  }

  /**
   * Get AccuWeather client instance for advanced operations
   * @returns {AccuWeatherClient} AccuWeather client instance
   */
  getClient() {
    return this.accuWeatherClient;
  }
}

module.exports = AccuWeatherService;
