import { Weather, WeatherType, WeatherEffect } from './types.js';

export class WeatherManager {
  private static instance: WeatherManager;
  private weatherConfig: any = null;

  public static getInstance(): WeatherManager {
    if (!WeatherManager.instance) {
      WeatherManager.instance = new WeatherManager();
    }
    return WeatherManager.instance;
  }

  // Initialize weather config data
  public async initialize(): Promise<void> {
    try {
      const response = await fetch('./data/weather_config.json');
      this.weatherConfig = await response.json();
    } catch (error) {
      console.error('Failed to load weather config:', error);
      // Use default config if file loading fails
      this.loadDefaultConfig();
    }
  }

  // Load default configuration if JSON file fails to load
  private loadDefaultConfig(): void {
    this.weatherConfig = {
      weather_config: {
        progression: {
          increment_per_move: 1,
          min_value: 0,
          max_value: 20,
          type_threshold: 10,
          severe_threshold: 15,
          storm_threshold: 20,
        },
        display_names: {
          clear: '快晴',
          cloudy: '曇り',
          fog: '霧',
          heavy_fog: '濃霧',
          rain: '雨',
          heavy_rain: '大雨',
          storm: '嵐',
        },
        weather_effects: {
          clear: { speed: 0, accuracy: 0, sight: 0 },
          cloudy: { speed: 0, accuracy: 0, sight: 0 },
          rain: { speed: -1, accuracy: -10, sight: 0 },
          heavy_rain: { speed: -2, accuracy: -20, sight: 0 },
          fog: { speed: 0, accuracy: -15, sight: -5 },
          heavy_fog: { speed: 0, accuracy: -30, sight: -10 },
          storm: { speed: -2, accuracy: -30, sight: -10 },
        },
        random_types: ['fog', 'rain'],
      },
    };
  }

  // Initialize weather system
  public initializeWeather(): Weather {
    if (!this.weatherConfig) {
      this.loadDefaultConfig();
    }

    const config = this.weatherConfig.weather_config;
    const displayNames = config.display_names;

    return {
      value: config.progression.min_value, // Start at minimum value
      type: '', // Start unset
      displayName: displayNames.clear, // Start with clear weather
    };
  }

  // Progress weather by one step (called when selecting events)
  public progressWeather(currentWeather: Weather): Weather {
    if (!this.weatherConfig) {
      console.warn('Weather config not loaded, using defaults');
      this.loadDefaultConfig();
    }

    const config = this.weatherConfig.weather_config;
    const newWeather = { ...currentWeather };

    // Increment weather value based on config
    newWeather.value = Math.min(
      config.progression.max_value,
      newWeather.value + config.progression.increment_per_move
    );

    // Update weather type and display name based on current state
    this.updateWeatherDisplay(newWeather);

    return newWeather;
  }

  // Update weather display name based on current state
  private updateWeatherDisplay(weather: Weather): void {
    if (!this.weatherConfig) {
      console.warn('Weather config not loaded, using defaults');
      this.loadDefaultConfig();
    }

    const config = this.weatherConfig.weather_config;
    const displayNames = config.display_names;

    if (weather.value >= config.progression.storm_threshold) {
      // Weather value 20 -> Storm regardless of type
      weather.displayName = displayNames.storm;
    } else if (
      weather.value >= config.progression.severe_threshold &&
      weather.type
    ) {
      // Weather value 15+ with type -> Severe weather
      switch (weather.type) {
        case 'fog':
          weather.displayName = displayNames.heavy_fog;
          break;
        case 'rain':
          weather.displayName = displayNames.heavy_rain;
          break;
        default:
          weather.displayName = this.getDisplayNameForValue(weather.value);
      }
    } else if (weather.value >= config.progression.type_threshold) {
      // Weather value 10+ -> Set type if not set, display based on type
      if (!weather.type) {
        weather.type = this.randomWeatherType();
      }

      switch (weather.type) {
        case 'fog':
          weather.displayName = displayNames.fog;
          break;
        case 'rain':
          weather.displayName = displayNames.rain;
          break;
        default:
          weather.displayName = this.getDisplayNameForValue(weather.value);
      }
    } else {
      // Weather value < 10 -> Reset type and use basic progression
      weather.type = '';
      weather.displayName = this.getDisplayNameForValue(weather.value);
    }
  }

  // Get display name for basic weather progression (value 0-9)
  private getDisplayNameForValue(value: number): string {
    if (!this.weatherConfig) {
      this.loadDefaultConfig();
    }

    const displayNames = this.weatherConfig.weather_config.display_names;

    if (value >= 5) {
      return displayNames.cloudy;
    } else {
      return displayNames.clear;
    }
  }

  // Randomly select weather type when value reaches 10
  private randomWeatherType(): WeatherType {
    if (!this.weatherConfig) {
      this.loadDefaultConfig();
    }

    const randomTypes = this.weatherConfig.weather_config.random_types;
    const randomIndex = Math.floor(Math.random() * randomTypes.length);
    return randomTypes[randomIndex];
  }

  // Get weather effects on player parameters
  public getWeatherEffects(weather: Weather): WeatherEffect {
    if (!this.weatherConfig) {
      console.warn('Weather config not loaded, using defaults');
      this.loadDefaultConfig();
    }

    const config = this.weatherConfig.weather_config;
    const weatherEffects = config.weather_effects;

    const effects: WeatherEffect = {
      speed: 0,
      accuracy: 0,
      sight: 0,
    };

    if (weather.value >= config.progression.storm_threshold) {
      // 嵐 (Storm) - affects speed, accuracy, and sight
      const stormEffects = weatherEffects.storm;
      effects.speed = stormEffects.speed;
      effects.accuracy = stormEffects.accuracy;
      effects.sight = stormEffects.sight;
    } else if (
      weather.value >= config.progression.severe_threshold &&
      weather.type
    ) {
      // Severe weather based on type
      switch (weather.type) {
        case 'fog':
          // 濃霧 (Dense fog) - affects accuracy and sight severely
          const heavyFogEffects = weatherEffects.heavy_fog;
          effects.speed = heavyFogEffects.speed;
          effects.accuracy = heavyFogEffects.accuracy;
          effects.sight = heavyFogEffects.sight;
          break;
        case 'rain':
          // 大雨 (Heavy rain) - affects speed and accuracy severely
          const heavyRainEffects = weatherEffects.heavy_rain;
          effects.speed = heavyRainEffects.speed;
          effects.accuracy = heavyRainEffects.accuracy;
          effects.sight = heavyRainEffects.sight;
          break;
      }
    } else if (
      weather.value >= config.progression.type_threshold &&
      weather.type
    ) {
      // Moderate weather based on type
      switch (weather.type) {
        case 'fog':
          // 霧 (Fog) - affects accuracy and sight
          const fogEffects = weatherEffects.fog;
          effects.speed = fogEffects.speed;
          effects.accuracy = fogEffects.accuracy;
          effects.sight = fogEffects.sight;
          break;
        case 'rain':
          // 雨 (Rain) - affects speed and accuracy
          const rainEffects = weatherEffects.rain;
          effects.speed = rainEffects.speed;
          effects.accuracy = rainEffects.accuracy;
          effects.sight = rainEffects.sight;
          break;
      }
    }
    // 快晴 and 曇り have no effects (clear and cloudy use default 0 values)

    return effects;
  }

  // Apply weather effects to sight value
  public getEffectiveSight(baseSight: number, weather: Weather): number {
    const effects = this.getWeatherEffects(weather);
    return Math.max(0, baseSight + effects.sight);
  }

  // Apply weather effects to speed value
  public getEffectiveSpeed(baseSpeed: number, weather: Weather): number {
    const effects = this.getWeatherEffects(weather);
    return Math.max(0, baseSpeed + effects.speed);
  }

  // Apply weather effects to accuracy (percentage)
  public getEffectiveAccuracy(baseAccuracy: number, weather: Weather): number {
    const effects = this.getWeatherEffects(weather);
    return Math.max(0, baseAccuracy + effects.accuracy);
  }
}
