# NMEA2000 Weather Provider Plugin for SignalK

**Want to populate all of the values for your NMEA2000 gauges but don't have a bunch of fancy sensors? No problem!**

This plugin transforms your internet connection into a comprehensive weather station. Instead of installing expensive temperature, pressure, humidity, and wind sensors, the NMEA2000 Weather Provider pulls real-time weather data from AccuWeather and feeds it directly into your NMEA2000 network.

Your chartplotter, multifunction displays, and instrument gauges will show complete environmental data - temperature, barometric pressure, humidity, wind speed/direction, heat index, wind chill, and more - all sourced from professional meteorological services and calculated using your vessel's actual motion data for accurate apparent wind readings.

A comprehensive SignalK plugin that provides real-time weather data from AccuWeather API, performs advanced wind calculations using vessel navigation data, and outputs standardized NMEA2000-compatible weather measurements every 5 seconds for marine navigation systems.

## Features

### 🌦️ AccuWeather Integration
- **AccuWeather API**: High-accuracy global weather data with detailed observations
- **Real Wind Direction**: Provides actual wind direction data when other APIs fail
- **Comprehensive Data**: Temperature, pressure, humidity, wind, dew point, wind chill, heat index
- **Location Caching**: Efficient API usage with cached location keys

### ⚡ Real-Time NMEA2000 Integration
- **5-Second Update Cycle**: Provides "real-time" data for NMEA2000 systems
- **17 Environment Paths**: Complete NMEA2000 weather parameter coverage
- **Default Value Handling**: Uses NMEA2000 standard defaults for missing data
- **Range Validation**: Ensures all values are within NMEA2000 specifications

### 🧭 Advanced Wind Calculations
- **Apparent Wind Speed/Angle**: Calculated using vessel motion vectors
- **Navigation Fallbacks**: Uses course, heading, or magnetic heading data
- **Wind Chill Factor**: Temperature-adjusted values for marine conditions  
- **Heat Index**: Comfort calculations for warm weather operations
- **Dew Point**: Visibility and condensation predictions

### 🔧 Enterprise-Ready Architecture
- **5-Minute Default Polling**: Optimized for AccuWeather API limits
- **Immediate Startup Fetch**: Weather data available within 5 seconds
- **Robust Error Handling**: Graceful degradation when API is unavailable
- **Memory Efficient**: Proper cleanup of timers and resources
- **Comprehensive Logging**: Debug-friendly with detailed operational logs

## Installation

### Prerequisites
- SignalK Server v2.0.0 or higher
- Node.js v20.0.0 or higher
- AccuWeather API key (free registration)
- Internet connection for weather API access

### SignalK App Store Installation (Recommended)
1. Open SignalK Admin UI
2. Navigate to "App Store" → "Available"
3. Search for "NMEA2000 Weather Provider"
4. Click "Install"

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/NearlCrews/signalk-n2k-weather-provider.git

# Navigate to your SignalK node_modules directory
cd ~/.signalk/node_modules

# Copy the plugin
cp -r /path/to/signalk-n2k-weather-provider ./

# Restart SignalK server
sudo systemctl restart signalk
```

## Configuration

### AccuWeather API Setup
1. Register at [AccuWeather Developer Portal](https://developer.accuweather.com/)
2. Create a new app to get your API key
3. Copy the API key to plugin configuration

### Plugin Configuration
1. Open SignalK Admin UI
2. Navigate to "Plugin Config" → "NMEA2000 Weather Provider"
3. Configure the plugin:

```json
{
  "accuWeatherApiKey": "your_api_key_here",
  "updateFrequency": 5,
  "useVesselPosition": true,
  "manualLatitude": 0,
  "manualLongitude": 0
}
```

### Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `accuWeatherApiKey` | String | Required | AccuWeather API key |
| `updateFrequency` | Number | 5 | Weather update interval (minutes) |
| `useVesselPosition` | Boolean | true | Get location from vessel navigation |
| `manualLatitude` | Number | 0 | Manual latitude (if vessel position disabled) |
| `manualLongitude` | Number | 0 | Manual longitude (if vessel position disabled) |

## NMEA2000 Data Paths

The plugin outputs weather data to these SignalK paths:

### Core Weather Parameters
- `environment.outside.temperature` - Air temperature (Kelvin)
- `environment.outside.relativeHumidity` - Relative humidity (ratio 0-1) 
- `environment.outside.pressure` - Atmospheric pressure (Pascals)
- `environment.outside.dewPointTemperature` - Dew point temperature (Kelvin)

### Wind Measurements  
- `environment.wind.speedTrue` - True wind speed (m/s)
- `environment.wind.directionTrue` - True wind direction (radians)
- `environment.wind.speedApparent` - Apparent wind speed (m/s) 
- `environment.wind.angleApparent` - Apparent wind angle (radians)
- `environment.wind.speedOverGround` - Wind speed over ground (m/s)
- `environment.wind.angleTrueWater` - True wind angle to water (radians)

### Comfort Indices
- `environment.outside.windChillTemperature` - Wind chill temperature (Kelvin)
- `environment.outside.heatIndexTemperature` - Heat index temperature (Kelvin)
- `environment.outside.theoreticalWindChillTemperature` - Theoretical wind chill (Kelvin)
- `environment.outside.apparentTemperature` - Apparent temperature (Kelvin)

### Additional Parameters
- `environment.outside.airDensity` - Air density (kg/m³)
- `environment.outside.absoluteHumidity` - Absolute humidity (kg/m³)
- `environment.outside.weatherDescription` - Text description

## Usage Examples

### Maritime Weather Monitoring
```javascript
// Access real-time weather data in your SignalK apps
const weatherData = app.getSelfPath('environment.outside');
const windData = app.getSelfPath('environment.wind');

console.log(`Current conditions:`);
console.log(`Temperature: ${(weatherData.temperature.value - 273.15).toFixed(1)}°C`);
console.log(`Wind: ${windData.speedTrue.value.toFixed(1)} m/s from ${(windData.directionTrue.value * 180 / Math.PI).toFixed(0)}°`);
console.log(`Apparent Wind: ${windData.angleApparent.value.toFixed(2)} rad relative to bow`);
```

### NMEA2000 Network Integration
The plugin automatically formats all data for NMEA2000 compliance:
- Temperature values in Kelvin with 0.01K resolution
- Pressure values in Pascals with 1 Pa resolution  
- Wind speeds in m/s with 0.01 m/s resolution
- Wind directions in radians with 0.0001 rad resolution
- Humidity as ratio (0-1) with 0.004% resolution

## Broadcasting to Physical NMEA2000 Network

To send weather data from this plugin to your physical NMEA2000 network (so chartplotters, MFDs, and instrument displays can show the data), use this plugin together with the **[signalk-to-nmea2000](https://www.npmjs.com/package/signalk-to-nmea2000)** plugin.

### Setup Overview
1. **This plugin** fetches weather data from AccuWeather and populates SignalK paths
2. **signalk-to-nmea2000 plugin** reads those SignalK paths and broadcasts NMEA2000 messages on your boat's network
3. **Your instruments** receive and display the weather data as if it came from physical sensors

### Installation & Configuration

#### Step 1: Install signalk-to-nmea2000 Plugin
```bash
# Via SignalK App Store (recommended)
# Admin UI → App Store → Available → "signalk-to-nmea2000" → Install

# Or via npm
npm install signalk-to-nmea2000
```

#### Step 2: Configure NMEA2000 Hardware Connection  
The signalk-to-nmea2000 plugin requires a hardware interface to your NMEA2000 network:
- **CAN-USB adapters**: Actisense NGT-1, Yacht Devices YDNU-02, etc.
- **Raspberry Pi CAN HAT**: PiCAN series, Waveshare RS485/CAN HAT
- **Built-in CAN**: Some marine computers have integrated CAN interfaces

#### Step 3: Configure signalk-to-nmea2000 Plugin
1. Open SignalK Admin UI → Plugin Config → signalk-to-nmea2000
2. Configure your CAN interface (typically `can0` for Pi CAN HATs)
3. **Enable weather data transmission** by adding these mappings:

```json
{
  "canDevice": "can0",
  "transmitPGNs": [
    {
      "pgn": 130310,
      "enabled": true,
      "comment": "Environmental Parameters"
    },
    {
      "pgn": 130306,
      "enabled": true, 
      "comment": "Wind Data"
    }
  ]
}
```

#### Step 4: Map Weather Data Paths
Configure which SignalK paths to broadcast as NMEA2000 messages:

```json
{
  "pathMappings": [
    {
      "signalkPath": "environment.outside.temperature",
      "pgn": 130310,
      "enabled": true
    },
    {
      "signalkPath": "environment.outside.pressure", 
      "pgn": 130310,
      "enabled": true
    },
    {
      "signalkPath": "environment.outside.relativeHumidity",
      "pgn": 130310, 
      "enabled": true
    },
    {
      "signalkPath": "environment.wind.speedApparent",
      "pgn": 130306,
      "enabled": true
    },
    {
      "signalkPath": "environment.wind.angleApparent", 
      "pgn": 130306,
      "enabled": true
    },
    {
      "signalkPath": "environment.wind.speedTrue",
      "pgn": 130306,
      "enabled": true
    },
    {
      "signalkPath": "environment.wind.directionTrue",
      "pgn": 130306,
      "enabled": true
    }
  ]
}
```

### Key NMEA2000 PGNs for Weather Data

| PGN | Name | Weather Parameters |
|-----|------|--------------------|
| **130310** | Environmental Parameters | Temperature, Pressure, Humidity |
| **130306** | Wind Data | Wind Speed, Wind Direction, Wind Angle |
| **130311** | Environmental Parameters 2 | Dew Point, Heat Index, Wind Chill |

### Verification & Testing

#### Check Data Flow
```bash
# 1. Verify this plugin is populating SignalK paths
curl http://localhost:3000/signalk/v1/api/vessels/self/environment/outside

# 2. Check NMEA2000 plugin is transmitting  
# Admin UI → Plugin Config → signalk-to-nmea2000 → View Logs

# 3. Monitor CAN traffic (if using Linux)
candump can0
```

#### Instrument Display
Your NMEA2000 instruments should now show:
- **Air Temperature** from internet weather data
- **Barometric Pressure** with trend information  
- **Relative Humidity** for comfort monitoring
- **True Wind** from weather service + GPS calculations
- **Apparent Wind** calculated from vessel motion
- **Wind Chill/Heat Index** for safety planning

### Network Considerations

#### Source Priorities
- Configure your chartplotter to prioritize this weather source appropriately
- Physical sensors (if present) typically take precedence over calculated data
- Use unique NMEA2000 source addresses to avoid conflicts

#### Update Rates
- Weather data updates every 5 minutes (AccuWeather API)
- NMEA2000 transmission can be more frequent (1-5 seconds)
- Apparent wind recalculates in real-time using vessel motion

#### Troubleshooting
```bash
# Check CAN interface is up
ip link show can0

# Verify NMEA2000 traffic
candump can0 | grep -E "(1F513|1F112)"  # PGN 130311, 130306

# Monitor plugin logs
journalctl -u signalk -f | grep -E "(n2k-weather|to-nmea2000)"
```

This setup transforms your internet connection into a comprehensive weather station that feeds professional meteorological data directly to all your boat's instruments - no physical sensors required!

## Troubleshooting

### Common Issues

#### No Weather Data
```bash
# Check plugin logs
journalctl -u signalk -f | grep "signalk-n2k-weather-provider"

# Verify position source
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/position
```

#### AccuWeather API Issues
- Confirm API key is valid and active
- Check API usage limits (50 calls/day free tier)
- Verify internet connectivity

#### Apparent Wind Calculations
- Plugin tries: courseOverGroundTrue → courseOverGroundMagnetic → headingTrue → headingMagnetic
- Ensure at least one navigation source is available
- Check for conflicting wind data from other sources

### Debug Mode
Enable detailed logging by setting the SignalK debug environment:
```bash
export DEBUG=signalk:signalk-n2k-weather-provider
```

### Log Analysis
Key log patterns to monitor:
```
✅ "Successfully retrieved weather data from AccuWeather"
✅ "Calculating apparent wind with complete vessel data"
⚠️  "Cannot calculate apparent wind - vessel data incomplete"
❌ "AccuWeather API key not provided"
```

## Development

### Building from Source
```bash
# Clone and install dependencies
git clone https://github.com/NearlCrews/signalk-n2k-weather-provider.git
cd signalk-n2k-weather-provider
npm install

# Run tests
npm test

# Run linting
npm run lint:fix

# Format code
npm run format
```

### Test Coverage
- **Wind Calculator**: Comprehensive vector math and unit conversion testing
- **Weather Aggregator**: AccuWeather API integration and error handling
- **Plugin Integration**: Lifecycle, configuration, and NMEA2000 path testing
- **Navigation Fallbacks**: Multi-source vessel data retrieval testing

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Ensure all tests pass: `npm test`
4. Follow code style: `npm run lint:fix`
5. Submit a pull request

## License

Apache 2.0 License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [SignalK Plugin Development Guide](https://demo.signalk.org/documentation/Developing/Plugins.html)
- **Issues**: [GitHub Issues](https://github.com/NearlCrews/signalk-n2k-weather-provider/issues)
- **Discussions**: [SignalK Community Forum](https://github.com/SignalK/signalk-server/discussions)
- **AccuWeather API**: [AccuWeather Developer Portal](https://developer.accuweather.com/)

## Changelog

### v1.0.0
- AccuWeather-only integration with real wind direction data
- Real-time NMEA2000 data output every 5 seconds  
- Advanced wind calculations with navigation data fallbacks
- Immediate startup weather data fetch
- Comprehensive test suite and production-ready architecture

---

*Built with ❤️ for the SignalK marine community*
