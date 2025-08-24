import { ChapterMap, MapNode, Chapter, EventType, GameState } from './types.js';

export class MapManager {
  generateChapterMap(
    chapter: Chapter,
    chapterConfig: any,
    currentChapter: number
  ): ChapterMap {
    const map: ChapterMap = {
      chapterId: currentChapter,
      nodes: {},
      startNodeId: 'start',
      bossNodeId: 'boss',
      totalLayers: chapter.requiredEvents + 2,
      eventTypeConfig: chapterConfig.eventTypes,
    };

    this.generateTreeStructure(map, chapter, chapterConfig);
    return map;
  }

  private generateTreeStructure(
    map: ChapterMap,
    chapter: Chapter,
    chapterConfig: any
  ): void {
    const totalLayers = chapter.requiredEvents + 2;
    const eventTypes = this.generateEventTypeDistribution(
      chapterConfig.eventTypes,
      chapter.requiredEvents
    );

    // Create start node
    map.nodes['start'] = {
      id: 'start',
      x: 0,
      y: 1,
      eventType: 'start',
      isVisible: true,
      isAccessible: true,
      connections: [],
      layer: 0,
      branchIndex: 0,
    };

    // Generate event layers (tree structure)
    let nodeCounter = 1;
    const layerNodes: string[][] = [['start']];

    for (let layer = 1; layer <= chapter.requiredEvents; layer++) {
      const currentLayerNodes: string[] = [];
      const previousLayer = layerNodes[layer - 1];

      // Each layer can have 1-4 events (maximum 4 per layer)
      const branchCount = Math.min(
        4,
        Math.max(1, Math.floor(Math.random() * 4) + 1)
      );

      for (let branch = 0; branch < branchCount; branch++) {
        const nodeId = `node_${nodeCounter++}`;
        const eventType = eventTypes.shift() || 'unknown';

        map.nodes[nodeId] = {
          id: nodeId,
          x: layer,
          y: branch,
          eventType,
          difficulty: chapter.difficulty + Math.floor(Math.random() * 3) - 1,
          isVisible: false,
          isAccessible: false,
          connections: [],
          layer,
          branchIndex: branch,
        };

        currentLayerNodes.push(nodeId);
      }

      // Connect previous layer nodes to current layer ensuring no orphans
      this.connectLayersWithOrphanPrevention(
        map,
        previousLayer,
        currentLayerNodes
      );
      layerNodes.push(currentLayerNodes);
    }

    // Create boss node and connect to final event layer
    map.nodes['boss'] = {
      id: 'boss',
      x: totalLayers - 1,
      y: 1,
      eventId: chapter.bossEvent,
      eventType: 'boss',
      difficulty: chapter.difficulty + 2,
      isVisible: false,
      isAccessible: false,
      connections: [],
      layer: totalLayers - 1,
      branchIndex: 0,
    };

    // Connect final event layer to boss
    const finalEventLayer = layerNodes[layerNodes.length - 1];
    finalEventLayer.forEach(nodeId => {
      map.nodes[nodeId].connections.push('boss');
    });
  }

  private generateEventTypeDistribution(
    config: any,
    totalEvents: number
  ): EventType[] {
    const eventTypes: EventType[] = [];
    const typeKeys = Object.keys(config) as EventType[];

    // First, add fixed count events
    typeKeys.forEach(type => {
      const typeConfig = config[type];
      if (typeConfig.fixedCount && typeConfig.fixedCount > 0) {
        for (let i = 0; i < typeConfig.fixedCount; i++) {
          eventTypes.push(type);
        }
      }
    });

    // Fill remaining slots based on weights
    const remainingSlots = totalEvents - eventTypes.length;
    const weightedTypes: EventType[] = [];

    typeKeys.forEach(type => {
      const weight = config[type].weight;
      for (let i = 0; i < weight; i++) {
        weightedTypes.push(type);
      }
    });

    for (let i = 0; i < remainingSlots; i++) {
      const randomType =
        weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
      eventTypes.push(randomType);
    }

    // Shuffle the array
    for (let i = eventTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eventTypes[i], eventTypes[j]] = [eventTypes[j], eventTypes[i]];
    }

    return eventTypes;
  }

  private connectLayersWithOrphanPrevention(
    map: ChapterMap,
    fromLayer: string[],
    toLayer: string[]
  ): void {
    // Sort both layers by their branchIndex to maintain order
    const sortedFromLayer = fromLayer.sort((a, b) => {
      return map.nodes[a].branchIndex - map.nodes[b].branchIndex;
    });
    const sortedToLayer = toLayer.sort((a, b) => {
      return map.nodes[a].branchIndex - map.nodes[b].branchIndex;
    });

    // Track all connections to detect and prevent crossings
    const connections: Array<{
      fromIndex: number;
      toIndex: number;
      fromId: string;
      toId: string;
    }> = [];

    // Function to check if two connections cross
    const connectionsCross = (conn1: any, conn2: any): boolean => {
      return (
        (conn1.fromIndex < conn2.fromIndex && conn1.toIndex > conn2.toIndex) ||
        (conn1.fromIndex > conn2.fromIndex && conn1.toIndex < conn2.toIndex)
      );
    };

    // Function to check if adding a new connection would create crossings
    const wouldCreateCrossing = (
      fromIndex: number,
      toIndex: number
    ): boolean => {
      return connections.some(existingConn =>
        connectionsCross({ fromIndex, toIndex }, existingConn)
      );
    };

    // Create connections using a greedy approach that prevents crossings
    sortedFromLayer.forEach((fromNodeId, fromIndex) => {
      const fromNode = map.nodes[fromNodeId];
      const maxConnections = Math.min(
        sortedToLayer.length,
        Math.max(1, Math.floor(Math.random() * 3) + 1)
      );

      // Find valid connections that don't cross existing ones
      const validConnections: Array<{ toIndex: number; toId: string }> = [];

      for (let toIndex = 0; toIndex < sortedToLayer.length; toIndex++) {
        const toId = sortedToLayer[toIndex];
        if (!wouldCreateCrossing(fromIndex, toIndex)) {
          validConnections.push({ toIndex, toId });
        }
      }

      // If no valid connections available, connect to the closest available node
      if (validConnections.length === 0) {
        // Find the closest node by index distance
        let closestDistance = Infinity;
        let closestToIndex = -1;
        let closestToId = '';

        for (let toIndex = 0; toIndex < sortedToLayer.length; toIndex++) {
          const distance = Math.abs(fromIndex - toIndex);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestToIndex = toIndex;
            closestToId = sortedToLayer[toIndex];
          }
        }

        if (closestToIndex >= 0) {
          validConnections.push({ toIndex: closestToIndex, toId: closestToId });
        }
      }

      // Select connections from valid options
      const connectionsToMake = Math.min(
        maxConnections,
        validConnections.length
      );

      // Prefer connections closer to the proportional position
      const idealToIndex =
        (fromIndex * (sortedToLayer.length - 1)) /
        Math.max(1, sortedFromLayer.length - 1);
      validConnections.sort((a, b) => {
        return (
          Math.abs(a.toIndex - idealToIndex) -
          Math.abs(b.toIndex - idealToIndex)
        );
      });

      for (let i = 0; i < connectionsToMake; i++) {
        const { toIndex, toId } = validConnections[i];
        if (!fromNode.connections.includes(toId)) {
          fromNode.connections.push(toId);
          connections.push({ fromIndex, toIndex, fromId: fromNodeId, toId });
        }
      }
    });

    // Ensure all nodes in the next layer have at least one connection
    const connectedNodes = new Set<string>();
    connections.forEach(conn => connectedNodes.add(conn.toId));

    sortedToLayer.forEach((toNodeId, toIndex) => {
      if (!connectedNodes.has(toNodeId)) {
        // Find the best from node that won't create crossings
        let bestFromIndex = -1;
        let bestFromId = '';

        for (
          let fromIndex = 0;
          fromIndex < sortedFromLayer.length;
          fromIndex++
        ) {
          const fromId = sortedFromLayer[fromIndex];
          if (!wouldCreateCrossing(fromIndex, toIndex)) {
            bestFromIndex = fromIndex;
            bestFromId = fromId;
            break;
          }
        }

        // If no non-crossing connection is possible, connect to the closest node
        if (bestFromIndex === -1) {
          const idealFromIndex =
            (toIndex * (sortedFromLayer.length - 1)) /
            Math.max(1, sortedToLayer.length - 1);
          bestFromIndex = Math.round(idealFromIndex);
          bestFromId =
            sortedFromLayer[
              Math.max(0, Math.min(bestFromIndex, sortedFromLayer.length - 1))
            ];
        }

        if (
          bestFromId &&
          !map.nodes[bestFromId].connections.includes(toNodeId)
        ) {
          map.nodes[bestFromId].connections.push(toNodeId);
          connections.push({
            fromIndex: bestFromIndex,
            toIndex,
            fromId: bestFromId,
            toId: toNodeId,
          });
        }
      }
    });
  }

  updateNodeVisibility(gameState: GameState): void {
    const currentNode = gameState.currentMap.nodes[gameState.currentNodeId];
    if (!currentNode) return;

    const playerSight = gameState.playerParameters.sight;
    const maxVisibleLayers = Math.min(
      2,
      Math.max(1, Math.floor(playerSight / 5))
    );

    // Reset accessibility first
    Object.values(gameState.currentMap.nodes).forEach(node => {
      node.isAccessible = false;
    });

    Object.values(gameState.currentMap.nodes).forEach(node => {
      const layerDistance = Math.abs(node.layer - currentNode.layer);

      // Nodes within sight range become visible
      if (layerDistance <= maxVisibleLayers) {
        node.isVisible = true;

        // However, if sight is too low compared to event difficulty, show as "???"
        if (
          node.eventType &&
          node.difficulty &&
          playerSight < node.difficulty * 3
        ) {
          // Will be handled in display method
        }
      }
    });

    // Make only directly connected nodes accessible
    currentNode.connections.forEach(connectedNodeId => {
      const connectedNode = gameState.currentMap.nodes[connectedNodeId];
      if (connectedNode) {
        connectedNode.isAccessible = true;
      }
    });
  }

  getVisibleNodes(currentNode: MapNode, gameState: GameState): string[] {
    // Return only directly connected accessible nodes (restricted by connections)
    return currentNode.connections.filter(nodeId => {
      const node = gameState.currentMap.nodes[nodeId];
      return node && node.isAccessible;
    });
  }

  getEventTypeName(
    eventType: EventType | undefined,
    node?: MapNode,
    playerSight?: number,
    visitedNodes?: Set<string>,
    currentNodeLayer?: number
  ): string {
    // If the node is from a past layer (layer < current layer), always show its type
    if (
      node &&
      currentNodeLayer !== undefined &&
      node.layer < currentNodeLayer
    ) {
      // Skip the sight check for past nodes
    } else if (
      // Check if player sight is insufficient to reveal event type for current/future nodes
      node &&
      node.difficulty &&
      playerSight &&
      playerSight < node.difficulty * 3
    ) {
      return '???';
    }

    switch (eventType) {
      case 'monster':
        return 'モンスター';
      case 'elite_monster':
        return 'エリートモンスター';
      case 'port':
        return '港';
      case 'treasure':
        return '宝';
      case 'boss':
        return 'ボス';
      case 'start':
        return 'スタート地点';
      case 'unknown':
        return '???';
      default:
        return '不明';
    }
  }
}
