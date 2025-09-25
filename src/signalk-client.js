class SignalKClient {
  constructor(app, debug) {
    this.app = app;
    this.debug = debug;
    this.cachedData = {
      position: null,
      speedOverGround: null,
      courseOverGroundTrue: null,
      lastUpdate: null,
    };
  }

  /**
   * Get current vessel position from SignalK navigation data
   * @returns {Object|null} Position object with latitude/longitude or null if not available
   */
  getVesselPosition() {
    try {
      const positionData = this.app.getSelfPath("navigation.position");

      if (!positionData || !positionData.value) {
        this.debug("No position data available from navigation.position");
        return null;
      }

      // Filter out data from signalk-node-red sources as requested
      if (this.isFromNodeRedSource(positionData)) {
        this.debug("Ignoring position data from signalk-node-red source");
        return null;
      }

      const position = {
        latitude: positionData.value.latitude,
        longitude: positionData.value.longitude,
        timestamp: positionData.timestamp || new Date().toISOString(),
        source: positionData.source,
      };

      // Validate position data
      if (!this.isValidPosition(position)) {
        this.debug("Invalid position data:", position);
        return null;
      }

      this.cachedData.position = position;
      this.debug("Retrieved vessel position:", position);
      return position;
    } catch (error) {
      this.debug("Error retrieving vessel position:", error);
      return null;
    }
  }

  /**
   * Get vessel speed over ground from SignalK navigation data
   * @returns {number|null} Speed in m/s or null if not available
   */
  getVesselSpeedOverGround() {
    try {
      const speedData = this.app.getSelfPath("navigation.speedOverGround");

      if (!speedData || typeof speedData.value !== "number") {
        this.debug("No speed over ground data available");
        return null;
      }

      // Filter out data from signalk-node-red sources
      if (this.isFromNodeRedSource(speedData)) {
        this.debug("Ignoring speed data from signalk-node-red source");
        return null;
      }

      // Validate speed data (should be non-negative)
      if (speedData.value < 0) {
        this.debug("Invalid negative speed value:", speedData.value);
        return null;
      }

      this.cachedData.speedOverGround = {
        value: speedData.value,
        timestamp: speedData.timestamp || new Date().toISOString(),
        source: speedData.source,
      };

      this.debug("Retrieved vessel speed over ground:", speedData.value, "m/s");
      return speedData.value;
    } catch (error) {
      this.debug("Error retrieving vessel speed over ground:", error);
      return null;
    }
  }

  /**
   * Get vessel course over ground from SignalK navigation data with fallbacks
   * @returns {number|null} Course in radians or null if not available
   */
  getVesselCourseOverGroundTrue() {
    try {
      // Try primary course over ground true first
      let courseData = this.app.getSelfPath("navigation.courseOverGroundTrue");

      // Fallback to magnetic course if true course not available
      if (!courseData || typeof courseData.value !== "number") {
        this.debug("No true course data, trying magnetic course");
        courseData = this.app.getSelfPath("navigation.courseOverGroundMagnetic");
      }

      // Fallback to heading if course not available
      if (!courseData || typeof courseData.value !== "number") {
        this.debug("No course data, trying heading true");
        courseData = this.app.getSelfPath("navigation.headingTrue");
      }

      // Fallback to magnetic heading
      if (!courseData || typeof courseData.value !== "number") {
        this.debug("No true heading, trying magnetic heading");
        courseData = this.app.getSelfPath("navigation.headingMagnetic");
      }

      if (!courseData || typeof courseData.value !== "number") {
        this.debug("No course or heading data available from any source");
        return null;
      }

      // Filter out data from signalk-node-red sources
      if (this.isFromNodeRedSource(courseData)) {
        this.debug("Ignoring course/heading data from signalk-node-red source");
        return null;
      }

      // Validate course data (should be 0-2π radians)
      if (courseData.value < 0 || courseData.value > 2 * Math.PI) {
        this.debug("Invalid course value (outside 0-2π range):", courseData.value);
        return null;
      }

      this.cachedData.courseOverGroundTrue = {
        value: courseData.value,
        timestamp: courseData.timestamp || new Date().toISOString(),
        source: courseData.source,
      };

      this.debug("Retrieved vessel course/heading:", courseData.value, "radians");
      return courseData.value;
    } catch (error) {
      this.debug("Error retrieving vessel course/heading:", error);
      return null;
    }
  }

  /**
   * Get all vessel navigation data in one call
   * @returns {Object} Object containing position, speed, and course data
   */
  getVesselData() {
    const vesselData = {
      position: this.getVesselPosition(),
      speedOverGround: this.getVesselSpeedOverGround(),
      courseOverGroundTrue: this.getVesselCourseOverGroundTrue(),
      dataAge: this.getDataAge(),
      isComplete: false,
    };

    // Check if we have complete navigation data
    vesselData.isComplete = !!(
      vesselData.position &&
      typeof vesselData.speedOverGround === "number" &&
      typeof vesselData.courseOverGroundTrue === "number"
    );

    this.debug("Complete vessel data retrieval:", {
      hasPosition: !!vesselData.position,
      hasSpeed: typeof vesselData.speedOverGround === "number",
      hasCourse: typeof vesselData.courseOverGroundTrue === "number",
      isComplete: vesselData.isComplete,
    });

    this.cachedData.lastUpdate = new Date();
    return vesselData;
  }

  /**
   * Get cached vessel data without making new SignalK calls
   * @returns {Object} Cached vessel data
   */
  getCachedVesselData() {
    return {
      ...this.cachedData,
      dataAge: this.getDataAge(),
    };
  }

  /**
   * Check if data source is from signalk-node-red (to be excluded per requirements)
   * @param {Object} data SignalK data object with source information
   * @returns {boolean} True if data is from node-red source
   */
  isFromNodeRedSource(data) {
    if (!data || !data.source) {
      return false;
    }

    const source = data.source.toLowerCase();
    return source.includes("signalk-node-red") || source.includes("node-red");
  }

  /**
   * Validate position coordinates
   * @param {Object} position Position object with latitude/longitude
   * @returns {boolean} True if position is valid
   */
  isValidPosition(position) {
    if (
      !position ||
      typeof position.latitude !== "number" ||
      typeof position.longitude !== "number"
    ) {
      return false;
    }

    // Check latitude range (-90 to 90 degrees)
    if (position.latitude < -90 || position.latitude > 90) {
      return false;
    }

    // Check longitude range (-180 to 180 degrees)
    if (position.longitude < -180 || position.longitude > 180) {
      return false;
    }

    return true;
  }

  /**
   * Get age of cached data in seconds
   * @returns {number|null} Age in seconds or null if no cached data
   */
  getDataAge() {
    if (!this.cachedData.lastUpdate) {
      return null;
    }

    return Math.floor((Date.now() - this.cachedData.lastUpdate) / 1000);
  }

  /**
   * Check if vessel is moving based on speed threshold
   * @param {number} threshold Speed threshold in m/s (default: 0.5 m/s ≈ 1 knot)
   * @returns {boolean} True if vessel is considered moving
   */
  isVesselMoving(threshold = 0.5) {
    const speed = this.getVesselSpeedOverGround();
    return speed !== null && speed > threshold;
  }

  /**
   * Convert speed from m/s to knots for debugging/logging
   * @param {number} speedMs Speed in meters per second
   * @returns {number} Speed in knots
   */
  msToKnots(speedMs) {
    return speedMs * 1.9438444924574;
  }

  /**
   * Convert course from radians to degrees for debugging/logging
   * @param {number} courseRad Course in radians
   * @returns {number} Course in degrees
   */
  radToDegrees(courseRad) {
    return courseRad * (180 / Math.PI);
  }
}

module.exports = SignalKClient;
