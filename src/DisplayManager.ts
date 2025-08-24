import { GameState, GameData, MapNode, EventType } from './types.js';
import { MapManager } from './MapManager.js';

export class DisplayManager {
  private mapManager: MapManager;

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;
  }

  updateParameterDisplay(
    gameState: GameState,
    gameData: GameData | null
  ): void {
    const params = gameState.playerParameters;

    // Update public parameters display
    this.updateParameterElement(
      'hull-display',
      `船体: ${params.hull}/${params.ship.hullMax}`
    );
    this.updateParameterElement('food-display', `食料: ${params.food}`);
    this.updateParameterElement('money-display', `資金: ${params.money}`);
    this.updateParameterElement(
      'crew-display',
      `乗組員: ${params.crew}/${params.ship.crewMax}`
    );
    this.updateParameterElement('sight-display', `視界: ${params.sight}`);
    this.updateParameterElement('weather-display', `天候: ${params.weather}`);
    this.updateParameterElement(
      'storage-display',
      `保管庫: ${params.relics.length}/${params.ship.storage}`
    );
    // Update weapons with clickable links
    this.updateWeaponsDisplay(params.weapons);

    // Update relics with clickable links
    this.updateRelicsDisplay(params.relics);

    // Update game progress
    const chapter = gameData?.chapters.find(
      c => c.id === gameState.currentChapter
    );
    if (chapter) {
      this.updateParameterElement(
        'chapter-display',
        `チャプター: ${gameState.currentChapter} - ${chapter.name}`
      );
      this.updateParameterElement(
        'progress-display',
        `進行: ${gameState.eventsCompleted}/${chapter.requiredEvents}`
      );
    }
  }

  private updateParameterElement(id: string, text: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  private updateWeaponsDisplay(weapons: any[]): void {
    const element = document.getElementById('weapons-display');
    if (element) {
      if (weapons.length === 0) {
        element.innerHTML = '武器: なし';
        return;
      }

      const weaponElements = weapons
        .map(
          weapon =>
            `<span class="clickable-weapon" data-weapon-id="${weapon.id}" title="${weapon.description}">⚔️ ${weapon.name}</span>`
        )
        .join(', ');

      element.innerHTML = `武器: ${weaponElements}`;

      // Add click listeners
      element.querySelectorAll('.clickable-weapon').forEach(weaponEl => {
        weaponEl.addEventListener('click', e => {
          const weaponId = (e.target as HTMLElement).getAttribute(
            'data-weapon-id'
          );
          const weapon = weapons.find(w => w.id === weaponId);
          if (weapon && (window as any).gameInstance) {
            (window as any).gameInstance.showWeaponDetail(weapon);
          }
        });
      });
    }
  }

  private updateRelicsDisplay(relics: any[]): void {
    const element = document.getElementById('relics-display');
    if (element) {
      if (relics.length === 0) {
        element.innerHTML = 'レリック: なし';
        return;
      }

      const relicElements = relics
        .map(
          relic =>
            `<span class="clickable-relic" data-relic-id="${relic.id}" title="${relic.description}">🏺 ${relic.name}</span>`
        )
        .join(', ');

      element.innerHTML = `レリック: ${relicElements}`;

      // Add click listeners
      element.querySelectorAll('.clickable-relic').forEach(relicEl => {
        relicEl.addEventListener('click', e => {
          const relicId = (e.target as HTMLElement).getAttribute(
            'data-relic-id'
          );
          const relic = relics.find(r => r.id === relicId);
          if (relic && (window as any).gameInstance) {
            (window as any).gameInstance.showRelicDetail(relic);
          }
        });
      });
    }
  }

  generateMapDisplay(gameState: GameState, sightRange: number): string {
    const currentNode = gameState.currentMap.nodes[gameState.currentNodeId];
    if (!currentNode) return '';

    let mapHtml = '<div class="map-container scrollable">';
    mapHtml += '<h3>周辺の海域</h3>';

    // Show all visible layers within extended sight range (up to the end of the map)
    const visibleNodes: MapNode[] = [];
    Object.values(gameState.currentMap.nodes).forEach(node => {
      visibleNodes.push(node);
    });

    // Group nodes by layer
    const nodesByLayer: { [layer: number]: MapNode[] } = {};
    visibleNodes.forEach(node => {
      if (!nodesByLayer[node.layer]) {
        nodesByLayer[node.layer] = [];
      }
      nodesByLayer[node.layer].push(node);
    });

    const layers = Object.keys(nodesByLayer)
      .map(Number)
      .sort((a, b) => a - b);

    // Constants for layout
    const nodeWidth = 180;
    const nodeHeight = 80;
    const layerSpacing = 250;
    const layerPadding = 50;
    const mapHeight = 500;

    // Calculate positions with center alignment
    const nodePositions: {
      [nodeId: string]: {
        centerX: number;
        centerY: number;
        leftX: number;
        rightX: number;
        topY: number;
        bottomY: number;
      };
    } = {};

    layers.forEach((layer, layerIndex) => {
      const layerNodes = nodesByLayer[layer];
      const totalLayerHeight =
        layerNodes.length * nodeHeight + (layerNodes.length - 1) * 20;
      const availableHeight = mapHeight - 80; // Account for header space (40px top + 40px bottom)
      const startY = (availableHeight - totalLayerHeight) / 2 + 40; // Center vertically with proper spacing

      layerNodes.forEach((node, nodeIndex) => {
        const centerX =
          layerIndex * layerSpacing + layerPadding + nodeWidth / 2;
        const centerY = startY + nodeIndex * (nodeHeight + 20) + nodeHeight / 2;

        nodePositions[node.id] = {
          centerX,
          centerY,
          leftX: centerX - nodeWidth / 2,
          rightX: centerX + nodeWidth / 2,
          topY: centerY - nodeHeight / 2,
          bottomY: centerY + nodeHeight / 2,
        };
      });
    });

    // Calculate total map width for SVG - ensure it covers all layers with extra margin
    const totalWidth = Math.max(
      (layers.length - 1) * layerSpacing + layerPadding * 2 + nodeWidth,
      layers.length * layerSpacing + layerPadding * 2 + nodeWidth + 100 // Extra margin for safety
    );

    // Generate SVG for connections
    let svgConnections = `<svg class="map-connections" xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${mapHeight}" viewBox="0 0 ${totalWidth} ${mapHeight}">`;

    // Draw connection lines - show ALL connections regardless of distance
    Object.values(gameState.currentMap.nodes).forEach(node => {
      if (
        node.connections &&
        node.connections.length > 0 &&
        nodePositions[node.id]
      ) {
        node.connections.forEach(connectedNodeId => {
          const connectedNode = gameState.currentMap.nodes[connectedNodeId];
          if (connectedNode && nodePositions[connectedNodeId]) {
            const fromPos = nodePositions[node.id];
            const toPos = nodePositions[connectedNodeId];

            const isCurrentPath =
              (node.id === gameState.currentNodeId ||
                gameState.visitedNodes.has(node.id)) &&
              node.connections.includes(connectedNodeId);

            // Calculate distance from current node for styling
            const fromDistance = Math.abs(node.layer - currentNode.layer);
            const toDistance = Math.abs(
              connectedNode.layer - currentNode.layer
            );
            const isDistantConnection = fromDistance >= 3 || toDistance >= 3;

            // Calculate connection points on the edges of the boxes
            let x1, y1, x2, y2;

            // From node: use right edge (since we're going to next layer)
            x1 = fromPos.rightX;
            y1 = fromPos.centerY;

            // To node: use left edge (since we're coming from previous layer)
            x2 = toPos.leftX;
            y2 = toPos.centerY;

            // If nodes are on the same layer (shouldn't happen in this design but safety check)
            if (node.layer === connectedNode.layer) {
              // Use top/bottom connection for same layer
              if (fromPos.centerY < toPos.centerY) {
                x1 = fromPos.centerX;
                y1 = fromPos.bottomY;
                x2 = toPos.centerX;
                y2 = toPos.topY;
              } else {
                x1 = fromPos.centerX;
                y1 = fromPos.topY;
                x2 = toPos.centerX;
                y2 = toPos.bottomY;
              }
            }

            let connectionClass = 'map-connection';
            if (isCurrentPath) {
              connectionClass += ' active';
            }
            if (isDistantConnection) {
              connectionClass += ' distant';
            }

            // Adjust line visibility based on distance and current path
            let strokeWidth = isCurrentPath
              ? '3'
              : isDistantConnection
              ? '1'
              : '2';
            let strokeColor = isCurrentPath
              ? '#66ccff'
              : isDistantConnection
              ? '#999'
              : '#666';
            let opacity = isCurrentPath
              ? '1'
              : isDistantConnection
              ? '0.8'
              : '0.9';

            svgConnections += `<line x1="${x1}" y1="${y1}" `;
            svgConnections += `x2="${x2}" y2="${y2}" `;
            svgConnections += `class="${connectionClass}" `;
            svgConnections += `stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
          }
        });
      }
    });

    svgConnections += '</svg>';
    mapHtml += svgConnections;

    // Render each layer
    layers.forEach((layer, layerIndex) => {
      const layerNodes = nodesByLayer[layer];
      const totalLayerHeight =
        layerNodes.length * nodeHeight + (layerNodes.length - 1) * 20;
      const availableHeight = mapHeight - 80; // Account for header space
      const startY = (availableHeight - totalLayerHeight) / 2 + 40; // Center vertically with proper spacing

      mapHtml += `<div class="map-layer" style="left: ${
        layerIndex * layerSpacing + layerPadding
      }px;">`;
      mapHtml += `<div class="layer-label">レイヤー ${layer}</div>`;
      mapHtml += `<div class="layer-nodes">`;

      layerNodes.forEach((node, nodeIndex) => {
        const isCurrentNode = node.id === gameState.currentNodeId;
        const isAccessible = node.isAccessible;
        const isVisited = gameState.visitedNodes.has(node.id);
        const layerDistance = Math.abs(layer - currentNode.layer);

        let nodeClass = 'map-node';
        if (isCurrentNode) nodeClass += ' current';
        if (isAccessible) nodeClass += ' accessible';
        if (isVisited) nodeClass += ' visited';
        if (layerDistance > 2) nodeClass += ' distant';

        // Apply masking for events 3+ layers away, but not for past layers
        let displayName;
        const currentNodeLayer =
          gameState.currentMap.nodes[gameState.currentNodeId]?.layer;
        const isPastNode =
          currentNodeLayer !== undefined && node.layer < currentNodeLayer;

        if (layerDistance >= 3 && !isPastNode) {
          displayName = '???';
        } else {
          displayName = node.eventType
            ? this.mapManager.getEventTypeName(
                node.eventType,
                node,
                gameState.playerParameters.sight,
                gameState.visitedNodes,
                currentNodeLayer
              )
            : '???';
        }

        const nodeY = startY + nodeIndex * (nodeHeight + 20);
        // Account for border width (2px on each side = 4px total) to prevent overflow
        const adjustedNodeWidth = nodeWidth - 4;

        // Add click handler for accessible nodes
        const clickHandler =
          node.isAccessible && gameState.gamePhase === 'navigation'
            ? `onclick="window.gameInstance.navigateToNode('${node.id}')"`
            : '';
        const cursorStyle =
          node.isAccessible && gameState.gamePhase === 'navigation'
            ? 'cursor: pointer;'
            : '';

        mapHtml += `<div class="${nodeClass}" title="${displayName}" `;
        mapHtml += `style="position: absolute; top: ${nodeY}px; left: 2px; width: ${adjustedNodeWidth}px; height: ${nodeHeight}px; ${cursorStyle}" `;
        mapHtml += `${clickHandler}>`;
        mapHtml += displayName;
        mapHtml += '</div>';
      });

      mapHtml += '</div></div>';
    });

    mapHtml += '</div>';
    return mapHtml;
  }

  showSaveStatus(message: string, isError: boolean = false): void {
    const statusElement = document.getElementById('save-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = isError ? '#ff6666' : '#66ccff';

      setTimeout(() => {
        statusElement.textContent = '';
      }, 3000);
    }
  }

  showError(message: string): void {
    const storyText = document.getElementById('story-text');
    if (storyText) {
      storyText.innerHTML = `<p style="color: #ff6666;">エラー: ${message}</p>`;
    }
  }

  scrollToNode(nodeId: string, gameState: GameState): void {
    const node = gameState.currentMap.nodes[nodeId];
    if (!node) return;

    // Wait for the display to update, then scroll
    setTimeout(() => {
      const mapContainer = document.querySelector(
        '.map-container.scrollable'
      ) as HTMLElement;
      if (!mapContainer) return;

      // Calculate scroll position based on node's layer
      const layerSpacing = 250;
      const targetScrollLeft = node.layer * layerSpacing;

      // Smooth scroll to the target position from current position
      mapContainer.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    }, 50); // Small delay to ensure DOM is updated
  }
}
