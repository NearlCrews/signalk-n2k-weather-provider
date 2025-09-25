const fetch = require("node-fetch");

class WeatherAggregator {
  constructor(settings, debug) {
    this.settings = settings;
    this.debug = debug;
    this.accuWeatherClient = new AccuWeatherClient(settings.accuWeatherApiKey, debug);
  }

  /**
   * Fetch weather data from AccuWeather API
   * @param {Object} position Position object with latitude/longitude
   * @returns {Promise<Object>} Weather data from AccuWeather
   */
  async getAggregatedWeatherData(position) {
    if (
      !position ||
      typeof position.latitude !== "number" ||
      typeof position.longitude !== "number"
    ) {
      throw new Error("Invalid position provided for weather data");
    }

    if (!this.settings.accuWeatherApiKey) {
      throw new Error("AccuWeather API key not provided");
    }

    try {
      const weatherData = await this.accuWeatherClient.getCurrentWeather(
        position.latitude,
        position.longitude,
      );

      this.debug("Successfully retrieved weather data from AccuWeather");
      return weatherData;
    } catch (error) {
      this.debug("AccuWeather API error:", error.message);
      throw error;
    }
  }
}

/**
 * AccuWeather API Client
 */
class AccuWeatherClient {
  constructor(apiKey, debug) {
    this.apiKey = apiKey;
    this.debug = debug;
    this.baseUrl = "http://dataservice.accuweather.com";
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
      throw new Error("AccuWeather API key not provided");
    }

    try {
      // Get location key (cached if available)
      const locationKey = await this.getLocationKey(latitude, longitude);

      // Get current conditions with details
      const url = `${this.baseUrl}/currentconditions/v1/${locationKey}?apikey=${this.apiKey}&details=true`;

      const response = await fetch(url, {
        headers: { "User-Agent": "NMEA2000WeatherForecast/1.0" },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid AccuWeather API key");
        }
        if (response.status === 429) {
          throw new Error("AccuWeather API rate limit exceeded");
        }
        throw new Error(`AccuWeather API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.convertAccuWeatherToStandardFormat(data[0]); // AccuWeather returns array
    } catch (error) {
      this.debug("AccuWeather API error:", error);
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
        headers: { "User-Agent": "NMEA2000WeatherForecast/1.0" },
      });

      if (!response.ok) {
        throw new Error(
          `AccuWeather location API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      const locationKey = data.Key;

      // Cache the location key
      this.locationCache.set(coordsKey, locationKey);

      this.debug(
        `Retrieved location key ${locationKey} for ${data.LocalizedName}, ${data.AdministrativeArea.LocalizedName}`,
      );
      return locationKey;
    } catch (error) {
      this.debug("AccuWeather location lookup error:", error);
      throw error;
    }
  }

  /**
   * Convert AccuWeather data to standard format
   * @param {Object} accuData AccuWeather current conditions data
   * @returns {Object} Standardized weather data
   */
  convertAccuWeatherToStandardFormat(accuData) {
    this.debug("Converting AccuWeather data:", {
      temperature: accuData.Temperature?.Metric?.Value,
      windDirection: accuData.Wind?.Direction?.Degrees,
      windSpeed: accuData.Wind?.Speed?.Metric?.Value,
    });

    return {
      temperature: this.convertAccuWeatherTemperature(accuData.Temperature),
      pressure: this.convertAccuWeatherPressure(accuData.Pressure),
      humidity: this.convertAccuWeatherHumidity(accuData.RelativeHumidity),
      windSpeed: this.convertAccuWeatherWindSpeed(accuData.Wind?.Speed),
      windDirection: this.convertAccuWeatherWindDirection(accuData.Wind?.Direction),
      dewPoint: this.convertAccuWeatherTemperature(accuData.DewPoint),
      windChill: this.convertAccuWeatherTemperature(accuData.WindChillTemperature),
      heatIndex: this.convertAccuWeatherTemperature(accuData.RealFeelTemperature),
      description: accuData.WeatherText,
      timestamp: new Date().toISOString(),
      source: "AccuWeather",
    };
  }

  /**
   * Convert AccuWeather temperature to Kelvin
   * @param {Object} tempData AccuWeather temperature data
   * @returns {number|null} Temperature in Kelvin
   */
  convertAccuWeatherTemperature(tempData) {
    if (!tempData || typeof tempData.Metric?.Value !== "number") return null;

    // AccuWeather temperatures are in Celsius, convert to Kelvin
    return tempData.Metric.Value + 273.15;
  }

  /**
   * Convert AccuWeather pressure to Pascals
   * @param {Object} pressureData AccuWeather pressure data
   * @returns {number|null} Pressure in Pascals
   */
  convertAccuWeatherPressure(pressureData) {
    if (!pressureData || typeof pressureData.Metric?.Value !== "number") return null;

    // AccuWeather pressure is in millibars, convert to Pascals
    return pressureData.Metric.Value * 100;
  }

  /**
   * Convert AccuWeather humidity to ratio (0-1)
   * @param {number} humidity AccuWeather humidity (could be percentage or ratio)
   * @returns {number|null} Humidity as ratio
   */
  convertAccuWeatherHumidity(humidity) {
    if (typeof humidity !== "number") return null;

    // AccuWeather humidity is typically in percentage (0-100), convert to ratio (0-1)
    // But handle cases where it might already be a ratio
    if (humidity <= 1.0) {
      // If humidity is <= 1.0, it's likely already a ratio
      this.debug(`AccuWeather humidity appears to be a ratio: ${humidity}`);
      return humidity;
    } else {
      // If humidity is > 1.0, it's likely a percentage, convert to ratio
      this.debug(`AccuWeather humidity appears to be percentage: ${humidity}%, converting to ratio: ${humidity / 100}`);
      return humidity / 100;
    }
  }

  /**
   * Convert AccuWeather wind speed to m/s
   * @param {Object} windSpeedData AccuWeather wind speed data
   * @returns {number|null} Wind speed in m/s
   */
  convertAccuWeatherWindSpeed(windSpeedData) {
    if (!windSpeedData || typeof windSpeedData.Metric?.Value !== "number") return null;

    // AccuWeather wind speed is in km/h, convert to m/s
    return windSpeedData.Metric.Value / 3.6;
  }

  /**
   * Convert AccuWeather wind direction to radians
   * @param {Object} windDirData AccuWeather wind direction data
   * @returns {number|null} Wind direction in radians
   */
  convertAccuWeatherWindDirection(windDirData) {
    this.debug("AccuWeather wind direction data:", windDirData);

    if (!windDirData || typeof windDirData.Degrees !== "number") {
      this.debug("AccuWeather wind direction invalid or missing");
      return null;
    }

    const degrees = windDirData.Degrees;
    const radians = degrees * (Math.PI / 180);
    this.debug(
      `AccuWeather wind direction: ${degrees}° (${windDirData.English}) -> ${radians} rad`,
    );

    return radians;
  }
}

module.exports = WeatherAggregator;
