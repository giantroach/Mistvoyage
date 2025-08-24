# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mistvoyage is a text-based offline roguelike game implemented as a web application in Japanese. The game features procedurally generated maps, auto-battle combat system, and RPG progression elements.

## Architecture

- **Tech Stack**: TypeScript, HTML5, CSS3 (compiled to JavaScript ES2020)
- **Game Engine**: Modular `MistvoyageGame` class in `src/game.ts` with specialized managers
- **Content System**: JSON-based chapters, monsters, weapons, and battle configuration
- **Save System**: LocalStorage-based persistence
- **Deployment**: Static files for GitHub Pages
- **Combat System**: Auto-battle with weapon cooldowns and statistical calculations

### Core Components

- `index.html` - Main game interface with dynamic content display
- `src/game.ts` - Main game orchestration and state management
- `src/types.ts` - TypeScript type definitions for all game data structures
- `src/MapManager.ts` - Procedural map generation and node management
- `src/NavigationManager.ts` - Navigation logic, node visibility, and scroll management
- `src/DisplayManager.ts` - UI rendering and visual updates
- `src/CombatSystem.ts` - Simple RPG-style combat (legacy, being replaced)
- `src/BattleManager.ts` - Advanced auto-battle system with weapon cooldowns
- `data/chapters.json` - Chapter configuration and event type weights
- `data/monsters.json` - Monster stats, encounters, and weapon definitions
- `data/weapons.json` - Weapon statistics and effects
- `data/battle_config.json` - Combat calculation modifiers and balancing
- `css/style.css` - Dark theme styling optimized for Japanese text

### Game Data Structure

The game uses multiple JSON files:
- **Chapters**: Define required events, difficulty, and event type probabilities
- **Monsters**: Individual monster stats and encounter combinations
- **Weapons**: Damage ranges, accuracy, cooldowns, and special effects
- **Battle Config**: Speed modifiers, weather effects, crew penalties, etc.
- **Game State**: Player parameters (Hull, Food, Money, Level, etc.) and current progress

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript files
npm run build

# Watch mode for development
npm run watch

# Start local development server (builds first)
npm run dev

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

- **Procedural Map Generation**: Tree-structured maps with up to 3 branches per layer
- **Auto-Battle Combat**: Weapon-based combat with cooldowns, accuracy, and damage calculations  
- **Navigation System**: Node visibility based on Sight parameter, accessible node connections
- **RPG Progression**: Level, health, attack, defense with experience-based advancement
- **Parameter Management**: Public parameters (Hull, Food, Money) and hidden parameters (Speed, Karma)
- **Weather System**: Weather affects combat accuracy and movement speed
- **Save/Load**: Complete game state persistence to LocalStorage
- **Event System**: Monster encounters, elite battles, ports, treasure, and boss fights

## Game Flow

1. **Ship Selection**: Choose starting ship with different stats and weapons
2. **Chapter Navigation**: Explore procedurally generated maps
3. **Event Processing**: Handle different event types (combat, treasure, ports)
4. **Auto-Battle**: Watch combat logs as weapons automatically fire
5. **Progression**: Gain experience, level up, earn gold, collect relics
6. **Chapter Completion**: Defeat boss after completing required events

## Important Implementation Notes

- **Combat System**: Use BattleManager.ts for auto-battle, not CombatSystem.ts
- **Navigation**: NavigationManager handles scroll positioning and node accessibility
- **Map Generation**: MapManager creates tree structures with proper connections
- **Display Updates**: Always call updateDisplay() after state changes
- **Game Phases**: 'ship_selection' → 'navigation' → 'event'/'combat' → 'battle_result' → 'navigation'