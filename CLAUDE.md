# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mistvoyage is a text-based offline adventure game implemented as a web application in Japanese. The game features a branching narrative system with conditional choices and variable tracking.

## Architecture

- **Tech Stack**: TypeScript, HTML5, CSS3 (compiled to JavaScript ES2020)
- **Game Engine**: Custom `MistvoyageGame` class in `src/game.ts` (compiled to `dist/game.js`)
- **Content System**: JSON-based scenes and choices in `data/game.json`
- **Save System**: LocalStorage-based persistence
- **Deployment**: Static files for GitHub Pages

### Core Components

- `index.html` - Main game interface with story display and choice buttons
- `src/game.ts` - Game engine handling scene loading, choice processing, and save/load
- `src/types.ts` - TypeScript type definitions for game data structures
- `data/game.json` - Game content with scenes, choices, actions, and conditions
- `css/style.css` - Dark theme styling optimized for Japanese text
- `dist/` - Compiled JavaScript output directory

### Game Data Structure

The `game.json` follows this pattern:
- **Scenes**: Each has `id`, `text`, and `choices` array
- **Choices**: Include `text`, `nextScene`, optional `actions` and `condition`
- **Actions**: String format like `set:variable:value` or `add:variable:number`
- **Conditions**: Simple format like `variable_name:expected_value`
- **Variables**: Tracked in `gameState.variables` for branching logic

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

- **Scene Navigation**: JSON-driven branching storylines
- **Variable System**: Set/add actions modify game state variables
- **Conditional Choices**: Choices can be hidden based on variable conditions
- **Text Processing**: Variable substitution in scene text using `{{variable}}` syntax
- **Save/Load**: Complete game state persistence to LocalStorage
- **Status Tracking**: Current scene and visited scenes tracking