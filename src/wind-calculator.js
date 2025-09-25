/**
 * Wind Calculator for Marine Applications
 * Implements proper vector calculations for apparent wind, wind chill, heat index, and dew point
 * Following standard meteorological formulas and marine navigation practices
 */

class WindCalculator {
  constructor(debug) {
    this.debug = debug || (() => {});
  }

  /**
   * Calculate apparent wind speed using vector addition
   * @param {number} trueWindSpeed - True wind speed in m/s
   * @param {number} vesselSpeed - Vessel speed over ground in m/s
   * @param {number} vesselHeading - Vessel heading in radians
   * @param {number} trueWindDirection - True wind direction in radians
   * @returns {number} Apparent wind speed in m/s
   */
  calculateApparentWindSpeed(trueWindSpeed, vesselSpeed, vesselHeading, trueWindDirection) {
    if (typeof trueWindSpeed !== "number" || typeof vesselSpeed !== "number") {
      return trueWindSpeed || 0;
    }

    // Convert wind direction to vector components
    const trueWindX = trueWindSpeed * Math.cos(trueWindDirection);
    const trueWindY = trueWindSpeed * Math.sin(trueWindDirection);

    // Convert vessel velocity to vector components
    const vesselX = vesselSpeed * Math.cos(vesselHeading);
    const vesselY = vesselSpeed * Math.sin(vesselHeading);

    // Calculate apparent wind vector (true wind - vessel velocity)
    const apparentWindX = trueWindX - vesselX;
    const apparentWindY = trueWindY - vesselY;

    // Calculate apparent wind speed from vector components
    const apparentWindSpeed = Math.sqrt(apparentWindX ** 2 + apparentWindY ** 2);

    return apparentWindSpeed;
  }

  /**
   * Calculate apparent wind angle relative to vessel heading
   * @param {number} trueWindSpeed - True wind speed in m/s
   * @param {number} vesselSpeed - Vessel speed over ground in m/s
   * @param {number} vesselHeading - Vessel heading in radians
   * @param {number} trueWindDirection - True wind direction in radians
   * @returns {number} Apparent wind angle relative to bow in radians
   */
  calculateApparentWindAngle(trueWindSpeed, vesselSpeed, vesselHeading, trueWindDirection) {
    if (typeof trueWindSpeed !== "number" || typeof vesselSpeed !== "number") {
      return trueWindDirection - vesselHeading;
    }

    // Convert wind direction to vector components
    const trueWindX = trueWindSpeed * Math.cos(trueWindDirection);
    const trueWindY = trueWindSpeed * Math.sin(trueWindDirection);

    // Convert vessel velocity to vector components
    const vesselX = vesselSpeed * Math.cos(vesselHeading);
    const vesselY = vesselSpeed * Math.sin(vesselHeading);

    // Calculate apparent wind vector (true wind - vessel velocity)
    const apparentWindX = trueWindX - vesselX;
    const apparentWindY = trueWindY - vesselY;

    // Calculate apparent wind direction
    const apparentWindDirection = Math.atan2(apparentWindY, apparentWindX);

    // Calculate angle relative to vessel heading
    let relativeAngle = apparentWindDirection - vesselHeading;

    // Normalize to -π to π
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    return relativeAngle;
  }

  /**
   * Calculate wind chill temperature using the modern formula
   * @param {number} temperatureK - Air temperature in Kelvin
   * @param {number} windSpeedMs - Wind speed in m/s
   * @returns {number} Wind chill temperature in Kelvin
   */
  calculateWindChill(temperatureK, windSpeedMs) {
    if (typeof temperatureK !== "number" || typeof windSpeedMs !== "number") {
      return temperatureK;
    }

    // Convert to Celsius and km/h for calculation
    const tempC = this.kelvinToCelsius(temperatureK);
    const windKmh = windSpeedMs * 3.6;

    // Wind chill is only meaningful for temperatures below 10°C and wind speeds above 4.8 km/h
    if (tempC >= 10 || windKmh < 4.8) {
      return temperatureK;
    }

    // Modern wind chill formula (Environment Canada / US National Weather Service)
    const windChill =
      13.12 + 0.6215 * tempC - 11.37 * windKmh ** 0.16 + 0.3965 * tempC * windKmh ** 0.16;

    return this.celsiusToKelvin(windChill);
  }

  /**
   * Calculate heat index (apparent temperature)
   * @param {number} temperatureK - Air temperature in Kelvin
   * @param {number} relativeHumidity - Relative humidity as ratio (0-1)
   * @returns {number} Heat index in Kelvin
   */
  calculateHeatIndex(temperatureK, relativeHumidity) {
    if (typeof temperatureK !== "number" || typeof relativeHumidity !== "number") {
      return temperatureK;
    }

    // Convert to Fahrenheit and percentage for calculation
    const tempF = this.kelvinToFahrenheit(temperatureK);
    const rhPercent = relativeHumidity * 100;

    // Heat index is only meaningful for temperatures above 80°F (26.7°C) and humidity above 40%
    if (tempF < 80 || rhPercent < 40) {
      return temperatureK;
    }

    // Rothfusz regression equation for heat index
    const c1 = -42.379;
    const c2 = 2.04901523;
    const c3 = 10.14333127;
    const c4 = -0.22475541;
    const c5 = -0.00683783;
    const c6 = -0.05481717;
    const c7 = 0.00122874;
    const c8 = 0.00085282;
    const c9 = -0.00000199;

    const t = tempF;
    const r = rhPercent;

    let heatIndex =
      c1 +
      c2 * t +
      c3 * r +
      c4 * t * r +
      c5 * t * t +
      c6 * r * r +
      c7 * t * t * r +
      c8 * t * r * r +
      c9 * t * t * r * r;

    // Apply adjustments for extreme conditions
    if (r < 13 && t >= 80 && t <= 112) {
      const adjustment = ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
      heatIndex -= adjustment;
    } else if (r > 85 && t >= 80 && t <= 87) {
      const adjustment = ((r - 85) / 10) * ((87 - t) / 5);
      heatIndex += adjustment;
    }

    return this.fahrenheitToKelvin(heatIndex);
  }

  /**
   * Calculate dew point temperature
   * @param {number} temperatureK - Air temperature in Kelvin
   * @param {number} relativeHumidity - Relative humidity as ratio (0-1)
   * @returns {number} Dew point temperature in Kelvin
   */
  calculateDewPoint(temperatureK, relativeHumidity) {
    if (typeof temperatureK !== "number" || typeof relativeHumidity !== "number") {
      return temperatureK;
    }

    const tempC = this.kelvinToCelsius(temperatureK);
    const rh = Math.max(0.01, Math.min(0.99, relativeHumidity)); // Clamp to valid range

    // Magnus formula constants
    const a = 17.27;
    const b = 237.7;

    // Calculate gamma
    const gamma = (a * tempC) / (b + tempC) + Math.log(rh);

    // Calculate dew point
    const dewPointC = (b * gamma) / (a - gamma);

    return this.celsiusToKelvin(dewPointC);
  }

  /**
   * Validate wind calculation inputs
   * @param {number} trueWindSpeed - True wind speed in m/s
   * @param {number} vesselSpeed - Vessel speed in m/s
   * @param {number} vesselHeading - Vessel heading in radians
   * @param {number} trueWindDirection - True wind direction in radians
   * @returns {boolean} True if inputs are valid
   */
  validateInputs(trueWindSpeed, vesselSpeed, vesselHeading, trueWindDirection) {
    return (
      typeof trueWindSpeed === "number" &&
      trueWindSpeed >= 0 &&
      typeof vesselSpeed === "number" &&
      vesselSpeed >= 0 &&
      typeof vesselHeading === "number" &&
      typeof trueWindDirection === "number"
    );
  }

  // Unit conversion utilities
  kelvinToCelsius(kelvin) {
    return kelvin - 273.15;
  }

  celsiusToKelvin(celsius) {
    return celsius + 273.15;
  }

  kelvinToFahrenheit(kelvin) {
    return ((kelvin - 273.15) * 9) / 5 + 32;
  }

  fahrenheitToKelvin(fahrenheit) {
    return ((fahrenheit - 32) * 5) / 9 + 273.15;
  }

  degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  radiansToDegrees(radians) {
    return (radians * 180) / Math.PI;
  }
}

module.exports = WindCalculator;
