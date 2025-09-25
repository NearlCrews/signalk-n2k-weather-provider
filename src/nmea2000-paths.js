/**
 * NMEA2000 Path Mapper for Weather Data
 * Maps weather data to specific NMEA2000 SignalK paths with proper units and defaults
 * Follows NMEA2000 specification for environmental data
 */

class NMEA2000PathMapper {
  constructor(debug) {
    this.debug = debug || (() => {});

    // NMEA2000 default values for missing data (per specification)
    this.defaults = {
      temperature: 273.15, // 0°C in Kelvin (data unavailable)
      pressure: 101325, // Standard atmospheric pressure in Pascals
      humidity: 0.5, // 50% as ratio (reasonable default)
      windSpeed: 0, // No wind
      windDirection: 0, // North
      dewPoint: 273.15, // 0°C in Kelvin
      windChill: 273.15, // 0°C in Kelvin
      heatIndex: 273.15, // 0°C in Kelvin
    };
  }

  /**
   * Map weather data to NMEA2000 SignalK paths
   * @param {Object} weatherData - Weather data from aggregator
   * @returns {Object} SignalK delta message with NMEA2000 paths
   */
  mapToSignalKPaths(weatherData) {
    if (!weatherData || typeof weatherData !== "object") {
      this.debug("No weather data provided, using defaults");
      weatherData = {};
    }

    const timestamp = new Date().toISOString();
    const values = [];

    // Temperature paths - All temperature values are in Kelvin per SignalK spec
    values.push({
      path: "environment.outside.temperature",
      value: this.getValueOrDefault(weatherData.temperature, "temperature"),
      timestamp,
      meta: {
        units: "K",
        displayName: "Outside Temperature",
        description: "Current outside air temperature from weather services",
      },
    });

    values.push({
      path: "environment.outside.dewPointTemperature",
      value: this.getValueOrDefault(weatherData.dewPoint, "dewPoint"),
      timestamp,
      meta: {
        units: "K",
        displayName: "Dew Point Temperature",
        description: "Dew point temperature from weather services",
      },
    });

    values.push({
      path: "environment.outside.apparentTemperature",
      value: this.getValueOrDefault(weatherData.heatIndex, "heatIndex"),
      timestamp,
      meta: {
        units: "K",
        displayName: "Apparent Temperature",
        description: "Heat index - how hot it feels when relative humidity is factored in",
      },
    });

    values.push({
      path: "environment.outside.windChillTemperature",
      value: this.getValueOrDefault(weatherData.windChill, "windChill"),
      timestamp,
      meta: {
        units: "K",
        displayName: "Wind Chill Temperature",
        description: "How cold it feels when wind speed is factored in",
      },
    });

    values.push({
      path: "environment.outside.theoreticalWindChillTemperature",
      value: this.getValueOrDefault(weatherData.windChill, "windChill"),
      timestamp,
      meta: {
        units: "K",
        displayName: "Theoretical Wind Chill Temperature",
        description: "Theoretical wind chill temperature calculation",
      },
    });

    values.push({
      path: "environment.outside.heatIndexTemperature",
      value: this.getValueOrDefault(weatherData.heatIndex, "heatIndex"),
      timestamp,
      meta: {
        units: "K",
        displayName: "Heat Index Temperature",
        description: "Heat index temperature - how hot it feels with humidity factored in",
      },
    });

    // Pressure path - Pascals per SignalK spec
    values.push({
      path: "environment.outside.pressure",
      value: this.getValueOrDefault(weatherData.pressure, "pressure"),
      timestamp,
      meta: {
        units: "Pa",
        displayName: "Atmospheric Pressure",
        description: "Atmospheric pressure from weather services",
      },
    });

    // Humidity path - Ratio (0-1) per SignalK spec
    values.push({
      path: "environment.outside.relativeHumidity",
      value: this.getValueOrDefault(weatherData.humidity, "humidity"),
      timestamp,
      meta: {
        units: "ratio",
        displayName: "Relative Humidity",
        description: "Relative humidity as a ratio (0.0 = 0%, 1.0 = 100%)",
      },
    });

    // Wind paths - True Wind
    values.push({
      path: "environment.wind.speedTrue",
      value: this.getValueOrDefault(weatherData.windSpeed, "windSpeed", "true wind"),
      timestamp,
      meta: {
        units: "m/s",
        displayName: "True Wind Speed",
        description: "True wind speed from weather services",
      },
    });

    values.push({
      path: "environment.wind.directionTrue",
      value: this.getValueOrDefault(weatherData.windDirection, "windDirection", "true wind"),
      timestamp,
      meta: {
        units: "rad",
        displayName: "True Wind Direction",
        description: "True wind direction in radians from weather services",
      },
    });

    // Wind paths - Apparent Wind
    values.push({
      path: "environment.wind.speedApparent",
      value: this.getValueOrDefault(weatherData.apparentWindSpeed, "windSpeed", "apparent wind"),
      timestamp,
      meta: {
        units: "m/s",
        displayName: "Apparent Wind Speed",
        description: "Apparent wind speed relative to vessel movement",
      },
    });

    values.push({
      path: "environment.wind.angleApparent",
      value: this.getValueOrDefault(
        weatherData.apparentWindAngle,
        "windDirection",
        "apparent wind",
      ),
      timestamp,
      meta: {
        units: "rad",
        displayName: "Apparent Wind Angle",
        description: "Apparent wind angle relative to vessel bow",
      },
    });

    // Additional wind paths
    values.push({
      path: "environment.wind.speedOverGround",
      value: this.getValueOrDefault(weatherData.windSpeed, "windSpeed", "over ground"),
      timestamp,
      meta: {
        units: "m/s",
        displayName: "Wind Speed Over Ground",
        description: "Wind speed relative to ground movement",
      },
    });

    values.push({
      path: "environment.wind.angleTrueWater",
      value: this.getValueOrDefault(weatherData.windDirection, "windDirection", "true water"),
      timestamp,
      meta: {
        units: "rad",
        displayName: "True Wind Angle to Water",
        description: "True wind angle relative to water surface",
      },
    });

    // Additional environmental paths
    values.push({
      path: "environment.outside.absoluteHumidity",
      value: this.calculateAbsoluteHumidity(
        this.getValueOrDefault(weatherData.temperature, "temperature"),
        this.getValueOrDefault(weatherData.humidity, "humidity"),
      ),
      timestamp,
      meta: {
        units: "kg/m3",
        displayName: "Absolute Humidity",
        description: "Absolute humidity in kg/m³",
      },
    });

    // Air density (useful for sailing calculations)
    values.push({
      path: "environment.outside.airDensity",
      value: this.calculateAirDensity(
        this.getValueOrDefault(weatherData.temperature, "temperature"),
        this.getValueOrDefault(weatherData.pressure, "pressure"),
        this.getValueOrDefault(weatherData.humidity, "humidity"),
      ),
      timestamp,
      meta: {
        units: "kg/m3",
        displayName: "Air Density",
        description: "Air density accounting for temperature, pressure, and humidity",
      },
    });

    // Weather description (if available from APIs)
    if (weatherData.description) {
      values.push({
        path: "environment.outside.weatherDescription",
        value: weatherData.description,
        timestamp,
      });
    }

    return {
      context: "vessels.self",
      updates: [
        {
          source: {
            label: "signalk-n2k-weather-provider",
          },
          timestamp,
          values,
        },
      ],
    };
  }

  /**
   * Get value from weather data or return NMEA2000 default
   * @param {any} value - Value from weather data
   * @param {string} type - Type of data for default lookup
   * @returns {number} Value or default
   */
  getValueOrDefault(value, type, pathContext = "") {
    // Check if value is a valid finite number
    if (typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value)) {
      return value;
    }

    const defaultValue = this.defaults[type];
    if (
      typeof defaultValue === "number" &&
      !Number.isNaN(defaultValue) &&
      Number.isFinite(defaultValue)
    ) {
      const context = pathContext ? ` (${pathContext})` : "";
      this.debug(`Using default value for ${type}${context}: ${defaultValue}`);
      return defaultValue;
    }

    const context = pathContext ? ` (${pathContext})` : "";
    this.debug(`No valid default available for ${type}${context}, using 0`);
    return 0;
  }

  /**
   * Calculate absolute humidity from temperature and relative humidity
   * @param {number} temperatureK - Temperature in Kelvin
   * @param {number} relativeHumidity - Relative humidity as ratio (0-1)
   * @returns {number} Absolute humidity in kg/m³
   */
  calculateAbsoluteHumidity(temperatureK, relativeHumidity) {
    if (
      typeof temperatureK !== "number" ||
      typeof relativeHumidity !== "number" ||
      !Number.isFinite(temperatureK) ||
      !Number.isFinite(relativeHumidity) ||
      temperatureK <= 0 ||
      relativeHumidity < 0
    ) {
      return 0;
    }

    try {
      // Convert to Celsius
      const tempC = temperatureK - 273.15;

      // Saturation vapor pressure (Magnus formula)
      const a = 17.27;
      const b = 237.7;
      const saturationPressure = 6.112 * Math.exp((a * tempC) / (b + tempC)); // hPa

      // Actual vapor pressure
      const vaporPressure = relativeHumidity * saturationPressure;

      // Absolute humidity in kg/m³
      const absoluteHumidity = (0.002166 * vaporPressure) / temperatureK;

      // Validate result
      if (!Number.isFinite(absoluteHumidity) || absoluteHumidity < 0) {
        return 0;
      }

      return absoluteHumidity;
    } catch (error) {
      this.debug(`Error calculating absolute humidity: ${error}`);
      return 0;
    }
  }

  /**
   * Calculate air density from temperature, pressure, and humidity
   * @param {number} temperatureK - Temperature in Kelvin
   * @param {number} pressurePa - Pressure in Pascals
   * @param {number} relativeHumidity - Relative humidity as ratio (0-1)
   * @returns {number} Air density in kg/m³
   */
  calculateAirDensity(temperatureK, pressurePa, relativeHumidity) {
    if (
      typeof temperatureK !== "number" ||
      typeof pressurePa !== "number" ||
      !Number.isFinite(temperatureK) ||
      !Number.isFinite(pressurePa) ||
      temperatureK <= 0 ||
      pressurePa <= 0
    ) {
      return 1.225; // Standard air density at sea level
    }

    try {
      // Gas constants
      const R_d = 287.0531; // Specific gas constant for dry air (J/kg·K)
      const R_v = 461.4964; // Specific gas constant for water vapor (J/kg·K)

      // Calculate vapor pressure
      const tempC = temperatureK - 273.15;
      const saturationPressure = 6.112 * Math.exp((17.27 * tempC) / (237.7 + tempC)) * 100; // Pa
      const vaporPressure = (relativeHumidity || 0) * saturationPressure;

      // Dry air pressure
      const dryAirPressure = pressurePa - vaporPressure;

      // Air density calculation (accounting for humidity)
      const density = dryAirPressure / (R_d * temperatureK) + vaporPressure / (R_v * temperatureK);

      // Validate result
      if (!Number.isFinite(density) || density <= 0) {
        return 1.225; // Standard air density at sea level
      }

      return density;
    } catch (error) {
      this.debug(`Error calculating air density: ${error}`);
      return 1.225; // Standard air density at sea level
    }
  }

  /**
   * Validate NMEA2000 data ranges and apply limits
   * @param {Object} weatherData - Weather data to validate
   * @returns {Object} Validated weather data
   */
  validateNMEA2000Ranges(weatherData) {
    if (!weatherData) return {};

    const validated = { ...weatherData };

    // Temperature range: -40°C to +85°C (NMEA2000 spec)
    if (validated.temperature) {
      validated.temperature = Math.max(233.15, Math.min(358.15, validated.temperature));
    }

    // Pressure range: 80000 to 120000 Pa (reasonable atmospheric range)
    if (validated.pressure) {
      validated.pressure = Math.max(80000, Math.min(120000, validated.pressure));
    }

    // Humidity range: 0 to 1 (0-100%)
    if (validated.humidity) {
      validated.humidity = Math.max(0, Math.min(1, validated.humidity));
    }

    // Wind speed range: 0 to 102.3 m/s (0-200 knots, NMEA2000 max)
    if (validated.windSpeed) {
      validated.windSpeed = Math.max(0, Math.min(102.3, validated.windSpeed));
    }

    if (validated.apparentWindSpeed) {
      validated.apparentWindSpeed = Math.max(0, Math.min(102.3, validated.apparentWindSpeed));
    }

    // Wind direction range: 0 to 2π radians
    if (validated.windDirection) {
      validated.windDirection =
        ((validated.windDirection % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }

    if (validated.apparentWindAngle) {
      // Apparent wind angle: -π to π radians
      while (validated.apparentWindAngle > Math.PI) validated.apparentWindAngle -= 2 * Math.PI;
      while (validated.apparentWindAngle < -Math.PI) validated.apparentWindAngle += 2 * Math.PI;
    }

    return validated;
  }

  /**
   * Get NMEA2000 path list for reference
   * @returns {Array<string>} List of all NMEA2000 paths used
   */
  getNMEA2000Paths() {
    return [
      "environment.outside.temperature",
      "environment.outside.dewPointTemperature",
      "environment.outside.apparentTemperature",
      "environment.outside.windChillTemperature",
      "environment.outside.pressure",
      "environment.outside.relativeHumidity",
      "environment.wind.speedTrue",
      "environment.wind.directionTrue",
      "environment.wind.speedApparent",
      "environment.wind.angleApparent",
      "environment.outside.absoluteHumidity",
      "environment.outside.airDensity",
      "environment.outside.weatherDescription",
    ];
  }
}

module.exports = NMEA2000PathMapper;
