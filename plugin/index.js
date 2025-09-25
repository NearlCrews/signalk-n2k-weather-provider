module.exports = (app) => {
  let timers = [];
  let weatherService = null;
  let pathMapper = null;
  let lastWeatherData = {};
  let emissionTimer = null;

  const plugin = {
    id: 'signalk-n2k-weather-provider',
    name: 'NMEA2000 Weather Provider',

    start: (settings, _restartPlugin) => {
      app.debug('Plugin starting with settings:', JSON.stringify(settings, null, 2));

      try {
        // Simplified settings structure for AccuWeather only
        const flattenedSettings = {
          // AccuWeather API
          accuWeatherApiKey: settings.accuWeatherApiKey ?? '',
          // Update settings - 5 minutes default for AccuWeather
          updateFrequency: settings.updateFrequency ?? 5,
          // Position settings
          useVesselPosition: settings.useVesselPosition ?? true,
          manualLatitude: settings.manualLatitude ?? 0,
          manualLongitude: settings.manualLongitude ?? 0,
        };

        app.debug(
          'Flattened settings being passed to WeatherService:',
          JSON.stringify(flattenedSettings, null, 2)
        );

        // Initialize weather service
        const WeatherService = require('../src/weather-service');
        weatherService = new WeatherService(app, flattenedSettings, app.debug);

        // Initialize NMEA2000 path mapper
        const NMEA2000PathMapper = require('../src/nmea2000-paths');
        pathMapper = new NMEA2000PathMapper(app.debug);

        // Start weather data collection using NOAA plugin pattern
        // Initialize weather service first
        weatherService.start();

        // Fetch initial data after 5 seconds like NOAA plugin
        setTimeout(() => {
          weatherService.updateWeatherData().catch((error) => {
            app.debug('Initial weather fetch failed:', error);
          });
        }, 5000);

        // Start 5-second emission timer for real-time NMEA2000 data
        emissionTimer = setInterval(() => {
          emitWeatherData();
        }, 5000); // 5 seconds for "real time" NMEA2000 recognition

        timers.push(emissionTimer);

        app.setPluginStatus('Started - Weather data collection active');
        app.debug('Plugin started successfully');
      } catch (error) {
        app.debug('Error starting plugin:', error);
        app.setPluginError(`Failed to start: ${error.message}`);
      }
    },

    stop: () => {
      app.debug('Plugin stopping');

      return new Promise((resolve) => {
        try {
          // Clear all timers
          timers.forEach((timer) => {
            if (timer) {
              clearInterval(timer);
            }
          });
          timers = [];
          emissionTimer = null;

          // Stop weather service
          if (weatherService) {
            weatherService.stop();
            weatherService = null;
          }

          // Clear cached data
          lastWeatherData = {};

          app.setPluginStatus('Stopped');
          app.debug('Plugin stopped successfully');
          resolve();
        } catch (error) {
          app.debug('Error stopping plugin:', error);
          resolve(); // Still resolve to prevent hanging
        }
      });
    },

    schema: () => {
      return {
        type: 'object',
        properties: {
          accuWeatherApiKey: {
            type: 'string',
            title: 'AccuWeather API Key',
            description: 'Get your API key at https://developer.accuweather.com',
            default: '',
          },
          updateFrequency: {
            type: 'number',
            title: 'Weather Update Frequency',
            description: 'How often to fetch weather data in minutes',
            default: 5,
            minimum: 1,
            maximum: 60,
          },
          useVesselPosition: {
            type: 'boolean',
            title: 'Use Vessel Position',
            description: '',
            default: true,
          },
          manualLatitude: {
            type: 'number',
            title: 'Manual Latitude',
            description: 'Only used when vessel position is disabled',
            minimum: -90,
            maximum: 90,
            default: 0,
          },
          manualLongitude: {
            type: 'number',
            title: 'Manual Longitude',
            description: 'Only used when vessel position is disabled',
            minimum: -180,
            maximum: 180,
            default: 0,
          },
        },
        required: ['accuWeatherApiKey'],
      };
    },

    uiSchema: () => {
      return {
        'ui:order': [
          'accuWeatherApiKey',
          'updateFrequency',
          'useVesselPosition',
          'manualLatitude',
          'manualLongitude',
        ],
        accuWeatherApiKey: {
          'ui:widget': 'password',
          'ui:title': 'AccuWeather API Key',
          'ui:help': '',
        },
        updateFrequency: {
          'ui:widget': 'updown',
          'ui:title': 'Weather Update Frequency',
          'ui:help': '',
        },
        useVesselPosition: {
          'ui:widget': 'checkbox',
          'ui:title': ' ',
          'ui:help': '',
        },
        manualLatitude: {
          'ui:widget': 'updown',
          'ui:help': '',
        },
        manualLongitude: {
          'ui:widget': 'updown',
          'ui:help': '',
        },
      };
    },
  };

  // Private function to emit weather data as SignalK deltas
  function emitWeatherData() {
    if (!pathMapper) {
      app.debug('Path mapper not initialized');
      return;
    }

    try {
      // Get latest weather data from service
      const currentData = weatherService ? weatherService.getCurrentWeatherData() : null;

      // Use current data or fall back to last known data
      const weatherData = currentData || lastWeatherData;

      if (currentData) {
        lastWeatherData = currentData;
      }

      // Validate and sanitize weather data for NMEA2000 ranges
      const validatedData = pathMapper.validateNMEA2000Ranges(weatherData);

      // Convert weather data to proper SignalK delta message
      const deltaMessage = pathMapper.mapToSignalKPaths(validatedData);

      if (deltaMessage?.updates && deltaMessage.updates.length > 0) {
        app.handleMessage(plugin.id, deltaMessage);

        const valueCount = deltaMessage.updates[0].values
          ? deltaMessage.updates[0].values.length
          : 0;
        app.debug('Emitted NMEA2000 weather data:', valueCount, 'values');
      } else {
        app.debug('No valid weather data to emit, using defaults');
        // Emit defaults when no data available
        const defaultDelta = pathMapper.mapToSignalKPaths({});
        app.handleMessage(plugin.id, defaultDelta);
      }
    } catch (error) {
      app.debug('Error emitting weather data:', error);
      // Emit defaults on any error to maintain NMEA2000 compliance
      try {
        const defaultDelta = pathMapper.mapToSignalKPaths({});
        app.handleMessage(plugin.id, defaultDelta);
      } catch (fallbackError) {
        app.debug('Error emitting default values:', fallbackError);
      }
    }
  }

  return plugin;
};
