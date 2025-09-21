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

      // Pre-select event types for this layer to ensure variety
      const layerEventTypes = this.selectEventTypesForLayer(
        eventTypes,
        branchCount,
        layer,
        chapterConfig.eventTypes
      );


      for (let branch = 0; branch < branchCount; branch++) {
        const eventType = layerEventTypes[branch] || 'unknown';

        const nodeId = `node_${nodeCounter++}`;
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

    // Add minimum count events - mark them as priority
    const priorityEvents: EventType[] = [];
    typeKeys.forEach(type => {
      const typeConfig = config[type];
      if (typeConfig.minCount && typeConfig.minCount > 0) {
        const currentCount = eventTypes.filter(t => t === type).length;
        const needToAdd = Math.max(0, typeConfig.minCount - currentCount);
        for (let i = 0; i < needToAdd; i++) {
          eventTypes.push(type);
          priorityEvents.push(type); // Track priority events
        }
      }
    });

    // Fill remaining slots based on weights, respecting maxCount
    const remainingSlots = totalEvents - eventTypes.length;
    const weightedTypes: EventType[] = [];

    typeKeys.forEach(type => {
      const typeConfig = config[type];
      const currentCount = eventTypes.filter(t => t === type).length;
      const maxCount = typeConfig.maxCount || totalEvents; // If no maxCount, use totalEvents as limit
      const availableSlots = maxCount - currentCount;

      if (availableSlots > 0) {
        const weight = typeConfig.weight || 0;
        for (let i = 0; i < weight; i++) {
          weightedTypes.push(type);
        }
      }
    });

    for (let i = 0; i < remainingSlots; i++) {
      if (weightedTypes.length === 0) break;

      const randomIndex = Math.floor(Math.random() * weightedTypes.length);
      const randomType = weightedTypes[randomIndex];

      // Check if we can still add this type
      const currentCount = eventTypes.filter(t => t === randomType).length;
      const maxCount = config[randomType].maxCount || totalEvents;

      if (currentCount < maxCount) {
        eventTypes.push(randomType);
      } else {
        // Remove this type from weightedTypes to avoid infinite loop
        weightedTypes.splice(randomIndex, 1);
        i--; // Retry this slot
      }
    }

    // Better shuffling algorithm to ensure more even distribution
    // Group events by type to control distribution
    const eventGroups: { [key: string]: EventType[] } = {};
    eventTypes.forEach(type => {
      if (!eventGroups[type]) {
        eventGroups[type] = [];
      }
      eventGroups[type].push(type);
    });

    // Create a more balanced final array
    const finalEventTypes: EventType[] = [];
    const availableTypeKeys = Object.keys(eventGroups) as EventType[];

    // First, add one of each type to promote variety
    const baseDistribution: EventType[] = [];
    availableTypeKeys.forEach(type => {
      if (eventGroups[type].length > 0) {
        baseDistribution.push(type);
        eventGroups[type].splice(0, 1);
      }
    });

    // Shuffle the base distribution
    for (let i = baseDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseDistribution[i], baseDistribution[j]] = [
        baseDistribution[j],
        baseDistribution[i],
      ];
    }

    // Add the base distribution first
    finalEventTypes.push(...baseDistribution);

    // Then add remaining events in a round-robin fashion
    let remainingEvents: EventType[] = [];
    availableTypeKeys.forEach(type => {
      remainingEvents.push(...eventGroups[type]);
    });

    // Shuffle remaining events
    for (let i = remainingEvents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingEvents[i], remainingEvents[j]] = [
        remainingEvents[j],
        remainingEvents[i],
      ];
    }

    finalEventTypes.push(...remainingEvents);

    return finalEventTypes;
  }

  private selectEventTypesForLayer(
    availableEvents: EventType[],
    branchCount: number,
    layer: number,
    eventTypeConfig: any
  ): EventType[] {
    const selectedTypes: EventType[] = [];
    const usedTypesInLayer = new Set<EventType>();

    // Create a copy of available events to avoid modifying the original
    const eventPool = [...availableEvents];

    for (let i = 0; i < branchCount; i++) {
      let selectedType: EventType = 'unknown';
      let selectedIndex = -1;

      // Phase 1: Try to find a unique event type (not used in this layer)
      for (let j = 0; j < eventPool.length; j++) {
        const candidateType = eventPool[j];

        // Check if this is a minCount (priority) event
        const isMinCountEvent = this.isMinCountEvent(
          candidateType,
          eventTypeConfig
        );

        // Check if this type is already used in current layer
        const isDuplicateInLayer = usedTypesInLayer.has(candidateType);

        // Check if elite_monster is too close to start
        const isEliteTooClose = candidateType === 'elite_monster' && layer <= 2;

        // For layers with multiple nodes, strongly avoid duplicates unless it's a priority event
        const shouldAvoidDuplicate =
          isDuplicateInLayer && branchCount >= 2 && !isMinCountEvent;

        // First priority: unique types that meet all constraints
        if (!shouldAvoidDuplicate && !isEliteTooClose) {
          selectedType = candidateType;
          selectedIndex = j;
          break;
        }
      }

      // Phase 2: If no unique type found, try priority events even if duplicate
      if (selectedIndex === -1) {
        for (let j = 0; j < eventPool.length; j++) {
          const candidateType = eventPool[j];
          const isMinCountEvent = this.isMinCountEvent(
            candidateType,
            eventTypeConfig
          );
          const isEliteTooClose =
            candidateType === 'elite_monster' && layer <= 2;

          // Allow priority events to be duplicated if necessary
          if (isMinCountEvent && !isEliteTooClose) {
            selectedType = candidateType;
            selectedIndex = j;
            break;
          }
        }
      }

      // Phase 3: If still no suitable type, allow any non-elite type
      if (selectedIndex === -1) {
        for (let j = 0; j < eventPool.length; j++) {
          const candidateType = eventPool[j];
          const isEliteTooClose =
            candidateType === 'elite_monster' && layer <= 2;

          if (!isEliteTooClose) {
            selectedType = candidateType;
            selectedIndex = j;
            break;
          }
        }
      }

      // Phase 4: Last resort - use any available type
      if (selectedIndex === -1 && eventPool.length > 0) {
        selectedType = eventPool[0];
        selectedIndex = 0;
      }

      // Add the selected type to our tracking
      usedTypesInLayer.add(selectedType);
      selectedTypes.push(selectedType);

      // Remove the selected event from the pool
      if (selectedIndex >= 0) {
        eventPool.splice(selectedIndex, 1);
      }

      // If we run out of events but still need more, use 'unknown'
      if (eventPool.length === 0 && i < branchCount - 1) {
        // Fill remaining slots with 'unknown'
        for (let k = i + 1; k < branchCount; k++) {
          selectedTypes.push('unknown');
        }
        break;
      }
    }

    return selectedTypes;
  }

  private isMinCountEvent(eventType: EventType, eventTypeConfig: any): boolean {
    const config = eventTypeConfig[eventType];
    return (
      config &&
      ((config.minCount && config.minCount > 0) ||
        (config.fixedCount && config.fixedCount > 0))
    );
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
      return '';
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
      case 'temple':
        return '寺院';
      default:
        return '';
    }
  }
}
