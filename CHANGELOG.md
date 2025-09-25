# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-24

### Added
- Initial release of SignalK NMEA2000 Weather Provider Plugin
- AccuWeather API integration for comprehensive weather data
- Real-time NMEA2000 data output every 5 seconds
- Advanced wind calculations using vessel navigation data
- 17 complete NMEA2000 environment paths supported
- Apparent wind speed/angle calculations with vessel motion vectors
- Navigation fallbacks (course → heading → magnetic heading)
- Weather comfort indices (wind chill, heat index, dew point)
- Enterprise-ready architecture with robust error handling
- Memory efficient with proper cleanup of timers and resources
- Comprehensive logging for debugging and monitoring
- Location-based weather queries using vessel position
- Manual latitude/longitude override capability
- Configurable update frequency (default 5 minutes)
- Complete test suite with wind calculator testing
- Production-ready with NMEA2000 specification compliance
- Range validation for all weather parameters
- Default value handling for missing data points

### Features
- **AccuWeather Integration**: High-accuracy global weather data with real wind direction
- **Real-Time Updates**: 5-second update cycle for NMEA2000 systems
- **Wind Calculations**: Apparent wind speed/angle using vessel motion vectors
- **Navigation Fallbacks**: Multiple heading source support for reliability
- **Comfort Indices**: Wind chill, heat index, and dew point calculations
- **Location Caching**: Efficient API usage with cached AccuWeather location keys
- **Error Handling**: Graceful degradation when API unavailable
- **Debug Support**: Comprehensive logging with debug-friendly output

### Technical Details
- **SignalK Compatibility**: v2.0.0 or higher
- **Node.js Requirement**: v20.0.0 or higher
- **API Integration**: AccuWeather Developer API
- **Update Frequency**: Configurable (default 5 minutes)
- **Data Paths**: 17 complete NMEA2000 environment paths
- **Memory Management**: Proper timer cleanup and resource management
- **Test Coverage**: Comprehensive unit and integration tests

### Installation Methods
- SignalK App Store installation (recommended)
- Manual installation from GitHub repository
- Development installation with source building

### Configuration Options
- AccuWeather API key (required)
- Update frequency setting
- Vessel position usage toggle
- Manual coordinates override
- Debug logging control

[1.0.0]: https://github.com/NearlCrews/signalk-n2k-weather-provider/releases/tag/v1.0.0
