# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mistvoyage is a text-based offline roguelike game implemented as a web application in Japanese. The game features procedurally generated maps, auto-battle combat system, and RPG progression elements.

## Architecture

- **Tech Stack**: Vue 3 + TypeScript + Vite (modern development stack)
- **Game Engine**: Modular `MistvoyageGame` class in `src/game.ts` with specialized managers
- **Content System**: JSON-based chapters, monsters, weapons, and battle configuration
- **Save System**: LocalStorage-based persistence
- **Deployment**: Static files for GitHub Pages
- **Combat System**: Auto-battle with weapon cooldowns and statistical calculations
- **Weather System**: Dynamic weather progression affecting combat and navigation
- **Temple System**: Weather reset functionality through prayer offerings
- **Debug System**: Comprehensive debug panel for testing and development

### Core Components

#### Game Engine
- `index.html` - Main game interface with dynamic content display
- `src/game.ts` - Main game orchestration and state management
- `src/types.ts` - TypeScript type definitions for all game data structures

#### Managers
- `src/MapManager.ts` - Procedural map generation and node management
- `src/NavigationManager.ts` - Navigation logic, node visibility, and scroll management
- `src/DisplayManager.ts` - UI rendering and visual updates
- `src/BattleManager.ts` - Advanced auto-battle system with weapon cooldowns
- `src/SaveManager.ts` - Game save/load functionality using LocalStorage
- `src/RelicManager.ts` - Relic system management and effects
- `src/PortManager.ts` - Port event handling and services (ship repair, weapon/relic purchases)
- `src/WeaponManager.ts` - Weapon generation and management system
- `src/WeatherManager.ts` - Weather progression and effects system
- `src/DebugManager.ts` - Development and testing utilities

#### Vue Components
- `src/App.vue` - Main Vue application component
- `src/components/BattleScreen.vue` - Combat interface and battle logs
- `src/components/BattleResultScreen.vue` - Post-battle results and rewards
- `src/components/PortScreen.vue` - Port services main interface
- `src/components/WeaponShop.vue` - Weapon purchasing interface
- `src/components/RelicShop.vue` - Relic purchasing interface
- `src/components/TempleScreen.vue` - Temple prayer and weather reset interface
- `src/components/ParameterDisplay.vue` - Player statistics display
- `src/components/MapDisplay.vue` - Interactive navigation map
- `src/components/CooldownDisplay.vue` - Weapon cooldown visualization
- `src/components/StatusDisplay.vue` - Status messages and notifications
- `src/components/DebugPanel.vue` - Debug tools and testing interface
- `src/components/WeaponDetailModal.vue` - Weapon detail display modal
- `src/components/RelicDetailModal.vue` - Relic detail display modal

#### Data Files
- `data/game.json` - Basic game settings and chapter definitions
- `data/ships.json` - Ship statistics and special rules
- `data/events.json` - Story event definitions (ports, treasure, bosses, etc.)
- `data/chapters.json` - Chapter definitions, event type configurations, and monster encounters (consolidated)
- `data/monsters.json` - Monster stats, encounters, and weapon definitions
- `data/weapons.json` - Weapon statistics and effects
- `data/battle_config.json` - Combat calculation modifiers, balancing, and weapon effectiveness matrix
- `data/relics.json` - Relic effects, rarities, and generation configuration
- `data/weather_config.json` - Weather progression settings and effects

#### Styling
- `src/style.css` - Dark theme styling optimized for Japanese text

### Game Data Structure

The game uses multiple JSON files:
- **Game**: Basic settings, title, version, and chapter definitions
- **Ships**: Ship stats (Hull, Crew, Speed, Storage, Weapon Slots) and special rules
- **Events**: Story event definitions (ports, treasure, boss encounters, etc.)
- **Event Config**: Define required events, difficulty, and event type probabilities for each chapter
- **Monsters**: Individual monster stats, encounter combinations, and armor types for damage calculation
- **Weapons**: Damage ranges, accuracy, cooldowns, special effects, and weapon types for armor effectiveness
- **Battle Config**: Speed modifiers, weather effects, crew penalties, and weapon effectiveness matrix
- **Relics**: Collectible items with various effects, rarity systems, and legendary abilities
- **Game State**: Player parameters (Hull, Food, Money, Level, etc.) and current progress

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Format code with Prettier (2-space indentation)
npm run format

# Deployment preparation
npm run deploy
```

## Code Standards

- **Indentation**: 2 spaces (configured via Prettier)
- **Formatting**: All code must be formatted with Prettier before commits
- **Auto-formatting**: Claude Code will automatically run `npm run format` after editing TypeScript, JSON, HTML, or CSS files

## Key Features

- **Procedural Map Generation**: Tree-structured maps with up to 4 branches per layer
- **Auto-Battle Combat**: Weapon-based combat with cooldowns, accuracy, damage calculations, and weapon effectiveness system
- **Navigation System**: Node visibility based on Sight parameter, accessible node connections
- **RPG Progression**: Level, health, attack, defense with experience-based advancement
- **Parameter Management**: Public parameters (Hull, Food, Money) and hidden parameters (Speed, Karma)
- **Weather System**: Progressive weather deterioration (0-20 scale) affecting combat accuracy, sight, and speed
- **Temple System**: Prayer offerings to reset weather conditions
- **Save/Load**: Complete game state persistence to LocalStorage
- **Event System**: Monster encounters, elite battles, ports, treasure, temple, unknown (???) events, and boss fights
- **Relic System**: Collectible items with various effects from stat boosts to legendary abilities
- **Debug System**: Comprehensive testing tools for weapons, relics, enemies, and game state
- **Vue 3 Components**: Modern reactive UI with component-based architecture

## Game Flow

1. **Ship Selection**: Choose starting ship with different stats and weapons
2. **Chapter Navigation**: Explore procedurally generated maps with weather progression
3. **Event Processing**: Handle different event types (combat, treasure, ports, temples)
4. **Auto-Battle**: Watch combat logs as weapons automatically fire with cooldown management
5. **Weather Management**: Monitor weather deterioration and use temples to reset conditions
6. **Progression**: Gain experience, level up, earn gold, collect relics
7. **Chapter Completion**: Defeat boss after completing required events

## Important Implementation Notes

- **Combat System**: Use BattleManager.ts for auto-battle, not CombatSystem.ts
- **Navigation**: NavigationManager handles scroll positioning and node accessibility
- **Map Generation**: MapManager creates tree structures with proper connections
- **Display Updates**: Always call updateDisplay() after state changes
- **Game Phases**: 'ship_selection' → 'navigation' → 'event'/'combat' → 'battle_result' → 'navigation'
- **Manager Architecture**: Modular design with specialized managers for different systems
- **Vue Components**: Event-driven communication between Vue components and game engine
- **Weather System**: WeatherManager handles progressive weather deterioration and effects
- **Debug Tools**: DebugPanel component provides comprehensive testing capabilities
- **Configuration**: Weather effects externalized to JSON for easy adjustment
- **Temple Events**: Integrated into event system with weather reset functionality
- **Unknown Events**: ??? events that randomly resolve to treasure/port/temple/monster with configurable probabilities
- **Modal System**: Unified weapon and relic detail display using Vue modals across all game phases
- **Event State Management**: Proper handling of event completion states to prevent duplication (e.g., treasure selection)
- **Legacy DOM Integration**: Custom events bridge legacy DOM components with Vue modal system
- **Weapon Effectiveness**: Damage multipliers based on weapon types vs armor types (piercing, fire, impact, slash, net vs shell, hull, scale, soft, ethereal)