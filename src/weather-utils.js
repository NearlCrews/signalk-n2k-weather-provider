/**
 * Weather Utilities Module
 * Centralized utility functions for unit conversions and weather calculations
 * Consolidates conversion logic from AccuWeatherClient and WindCalculator
 */

// === Temperature Conversions ===

/**
 * Convert Celsius to Kelvin
 * @param {number} celsius Temperature in Celsius
 * @returns {number} Temperature in Kelvin
 */
function celsiusToKelvin(celsius) {
  return celsius + 273.15;
}

/**
 * Convert Kelvin to Celsius
 * @param {number} kelvin Temperature in Kelvin
 * @returns {number} Temperature in Celsius
 */
function kelvinToCelsius(kelvin) {
  return kelvin - 273.15;
}

/**
 * Convert Kelvin to Fahrenheit
 * @param {number} kelvin Temperature in Kelvin
 * @returns {number} Temperature in Fahrenheit
 */
function kelvinToFahrenheit(kelvin) {
  return ((kelvin - 273.15) * 9) / 5 + 32;
}

/**
 * Convert Fahrenheit to Kelvin
 * @param {number} fahrenheit Temperature in Fahrenheit
 * @returns {number} Temperature in Kelvin
 */
function fahrenheitToKelvin(fahrenheit) {
  return ((fahrenheit - 32) * 5) / 9 + 273.15;
}

/**
 * Convert AccuWeather temperature to Kelvin
 * @param {Object} tempData AccuWeather temperature data
 * @returns {number|null} Temperature in Kelvin
 */
function convertAccuWeatherTemperature(tempData) {
  if (!tempData || typeof tempData.Metric?.Value !== 'number') return null;

  // AccuWeather temperatures are in Celsius, convert to Kelvin
  return celsiusToKelvin(tempData.Metric.Value);
}

// === Pressure Conversions ===

/**
 * Convert millibars to Pascals
 * @param {number} millibars Pressure in millibars
 * @returns {number} Pressure in Pascals
 */
function millibarsToPA(millibars) {
  return millibars * 100;
}

/**
 * Convert AccuWeather pressure to Pascals
 * @param {Object} pressureData AccuWeather pressure data
 * @returns {number|null} Pressure in Pascals
 */
function convertAccuWeatherPressure(pressureData) {
  if (!pressureData || typeof pressureData.Metric?.Value !== 'number') return null;

  // AccuWeather pressure is in millibars, convert to Pascals
  return millibarsToPA(pressureData.Metric.Value);
}

// === Humidity Conversions ===

/**
 * Convert percentage to ratio
 * @param {number} percentage Percentage value (0-100)
 * @returns {number} Ratio value (0-1)
 */
function percentageToRatio(percentage) {
  return percentage / 100;
}

/**
 * Convert AccuWeather humidity to ratio (0-1)
 * @param {number} humidity AccuWeather humidity (could be percentage or ratio)
 * @returns {number|null} Humidity as ratio
 */
function convertAccuWeatherHumidity(humidity) {
  if (typeof humidity !== 'number') return null;

  // AccuWeather humidity is typically in percentage (0-100), convert to ratio (0-1)
  // But handle cases where it might already be a ratio
  if (humidity <= 1.0) {
    // If humidity is <= 1.0, it's likely already a ratio
    return humidity;
  } else {
    // If humidity is > 1.0, it's likely a percentage, convert to ratio
    return percentageToRatio(humidity);
  }
}

// === Wind Speed Conversions ===

/**
 * Convert km/h to m/s
 * @param {number} kmh Speed in km/h
 * @returns {number} Speed in m/s
 */
function kmhToMS(kmh) {
  return kmh / 3.6;
}

/**
 * Convert m/s to km/h
 * @param {number} ms Speed in m/s
 * @returns {number} Speed in km/h
 */
function msToKMH(ms) {
  return ms * 3.6;
}

/**
 * Convert AccuWeather wind speed to m/s
 * @param {Object} windSpeedData AccuWeather wind speed data
 * @returns {number|null} Wind speed in m/s
 */
function convertAccuWeatherWindSpeed(windSpeedData) {
  if (!windSpeedData || typeof windSpeedData.Metric?.Value !== 'number') return null;

  // AccuWeather wind speed is in km/h, convert to m/s
  return kmhToMS(windSpeedData.Metric.Value);
}

// === Direction Conversions ===

/**
 * Convert degrees to radians
 * @param {number} degrees Angle in degrees
 * @returns {number} Angle in radians
 */
function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @param {number} radians Angle in radians
 * @returns {number} Angle in degrees
 */
function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Convert AccuWeather wind direction to radians
 * @param {Object} windDirData AccuWeather wind direction data
 * @returns {number|null} Wind direction in radians
 */
function convertAccuWeatherWindDirection(windDirData) {
  if (!windDirData || typeof windDirData.Degrees !== 'number') {
    return null;
  }

  const degrees = windDirData.Degrees;
  return degreesToRadians(degrees);
}

// === Validation Utilities ===

/**
 * Validate numeric input within optional bounds
 * @param {*} value Value to validate
 * @param {number} [min] Minimum allowed value
 * @param {number} [max] Maximum allowed value
 * @returns {boolean} True if valid number within bounds
 */
function isValidNumber(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }
  if (min !== undefined && value < min) {
    return false;
  }
  if (max !== undefined && value > max) {
    return false;
  }
  return true;
}

/**
 * Clamp a value between min and max bounds
 * @param {number} value Value to clamp
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// === Angle Normalization ===

/**
 * Normalize angle to -π to π range
 * @param {number} radians Angle in radians
 * @returns {number} Normalized angle in radians
 */
function normalizeAngle(radians) {
  let angle = radians;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

module.exports = {
  // Temperature conversions
  celsiusToKelvin,
  kelvinToCelsius,
  kelvinToFahrenheit,
  fahrenheitToKelvin,
  convertAccuWeatherTemperature,
  // Pressure conversions
  millibarsToPA,
  convertAccuWeatherPressure,
  // Humidity conversions
  percentageToRatio,
  convertAccuWeatherHumidity,
  // Wind speed conversions
  kmhToMS,
  msToKMH,
  convertAccuWeatherWindSpeed,
  // Direction conversions
  degreesToRadians,
  radiansToDegrees,
  convertAccuWeatherWindDirection,
  // Validation utilities
  isValidNumber,
  clamp,
  // Angle normalization
  normalizeAngle,
};
