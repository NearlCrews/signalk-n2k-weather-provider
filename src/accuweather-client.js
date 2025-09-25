const fetch = require('node-fetch');
const {
  convertAccuWeatherTemperature,
  convertAccuWeatherPressure,
  convertAccuWeatherHumidity,
  convertAccuWeatherWindSpeed,
  convertAccuWeatherWindDirection,
} = require('./weather-utils');

/**
 * AccuWeather API Client
 * Handles communication with AccuWeather API for weather data retrieval
 */
class AccuWeatherClient {
  constructor(apiKey, debug) {
    this.apiKey = apiKey;
    this.debug = debug || (() => {});
    this.baseUrl = 'http://dataservice.accuweather.com';
    this.locationCache = new Map(); // Cache location keys to avoid repeated lookups
  }

  /**
   * Get current weather from AccuWeather API
   * @param {number} latitude Latitude in degrees
   * @param {number} longitude Longitude in degrees
   * @returns {Promise<Object>} Weather data
   */
  async getCurrentWeather(latitude, longitude) {
    if (!this.apiKey) {
      throw new Error('AccuWeather API key not provided');
    }

    try {
      // Get location key (cached if available)
      const locationKey = await this.getLocationKey(latitude, longitude);

      // Get current conditions with details
      const url = `${this.baseUrl}/currentconditions/v1/${locationKey}?apikey=${this.apiKey}&details=true`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'NMEA2000WeatherForecast/1.0' },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid AccuWeather API key');
        }
        if (response.status === 429) {
          throw new Error('AccuWeather API rate limit exceeded');
        }
        throw new Error(`AccuWeather API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.convertAccuWeatherToStandardFormat(data[0]); // AccuWeather returns array
    } catch (error) {
      this.debug('AccuWeather API error:', error);
      throw error;
    }
  }

  /**
   * Get AccuWeather location key for coordinates
   * @param {number} latitude Latitude in degrees
   * @param {number} longitude Longitude in degrees
   * @returns {Promise<string>} Location key
   */
  async getLocationKey(latitude, longitude) {
    const coordsKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    // Check cache first
    if (this.locationCache.has(coordsKey)) {
      this.debug(`Using cached location key for ${coordsKey}`);
      return this.locationCache.get(coordsKey);
    }

    try {
      const url = `${this.baseUrl}/locations/v1/cities/geoposition/search?apikey=${this.apiKey}&q=${latitude},${longitude}`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'NMEA2000WeatherForecast/1.0' },
      });

      if (!response.ok) {
        throw new Error(
          `AccuWeather location API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      const locationKey = data.Key;

      // Cache the location key
      this.locationCache.set(coordsKey, locationKey);

      this.debug(
        `Retrieved location key ${locationKey} for ${data.LocalizedName}, ${data.AdministrativeArea.LocalizedName}`
      );
      return locationKey;
    } catch (error) {
      this.debug('AccuWeather location lookup error:', error);
      throw error;
    }
  }

  /**
   * Convert AccuWeather data to standard format using WeatherUtils
   * @param {Object} accuData AccuWeather current conditions data
   * @returns {Object} Standardized weather data
   */
  convertAccuWeatherToStandardFormat(accuData) {
    this.debug('Converting AccuWeather data:', {
      temperature: accuData.Temperature?.Metric?.Value,
      windDirection: accuData.Wind?.Direction?.Degrees,
      windSpeed: accuData.Wind?.Speed?.Metric?.Value,
      rawHumidity: accuData.RelativeHumidity,
    });

    const convertedData = {
      temperature: convertAccuWeatherTemperature(accuData.Temperature),
      pressure: convertAccuWeatherPressure(accuData.Pressure),
      humidity: convertAccuWeatherHumidity(accuData.RelativeHumidity),
      windSpeed: convertAccuWeatherWindSpeed(accuData.Wind?.Speed),
      windDirection: convertAccuWeatherWindDirection(accuData.Wind?.Direction),
      dewPoint: convertAccuWeatherTemperature(accuData.DewPoint),
      windChill: convertAccuWeatherTemperature(accuData.WindChillTemperature),
      heatIndex: convertAccuWeatherTemperature(accuData.RealFeelTemperature),
      description: accuData.WeatherText,
      timestamp: new Date().toISOString(),
      source: 'AccuWeather',
    };

    this.debug('Converted weather data - humidity details:', {
      rawHumidity: accuData.RelativeHumidity,
      convertedHumidity: convertedData.humidity,
      expectedDisplayPercentage: convertedData.humidity * 100,
    });

    return convertedData;
  }
}

module.exports = AccuWeatherClient;
