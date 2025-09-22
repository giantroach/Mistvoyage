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

    // Debug: Check if fixedCount events are properly included
    const templeCount = eventTypes.filter(e => e === 'temple').length;
    const portCount = eventTypes.filter(e => e === 'port').length;
    const treasureCount = eventTypes.filter(e => e === 'treasure').length;
    const unknownCount = eventTypes.filter(e => e === 'unknown').length;
    console.log(
      `Generated events: temple=${templeCount}, port=${portCount}, treasure=${treasureCount}, unknown=${unknownCount}`,
      eventTypes
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

    // Track used event counts to respect maxCount
    const usedEventCounts: { [key: string]: number } = {};
    Object.keys(chapterConfig.eventTypes).forEach(type => {
      usedEventCounts[type] = 0;
    });

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
        chapterConfig.eventTypes,
        usedEventCounts
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
    console.log('=== Event Type Distribution Debug ===');
    console.log('Total events needed:', totalEvents);
    console.log('Config:', config);

    const eventTypes: EventType[] = [];
    const typeKeys = Object.keys(config) as EventType[];

    // First, add fixed count events
    console.log('Phase 1: Adding fixed count events');
    typeKeys.forEach(type => {
      const typeConfig = config[type];
      if (typeConfig.fixedCount && typeConfig.fixedCount > 0) {
        console.log(`Adding ${typeConfig.fixedCount} ${type} (fixedCount)`);
        for (let i = 0; i < typeConfig.fixedCount; i++) {
          eventTypes.push(type);
        }
      }
    });
    console.log('After fixed count:', eventTypes);

    // Add minimum count events - mark them as priority
    console.log('Phase 2: Adding minimum count events');
    const priorityEvents: EventType[] = [];
    typeKeys.forEach(type => {
      const typeConfig = config[type];
      if (typeConfig.minCount && typeConfig.minCount > 0) {
        const currentCount = eventTypes.filter(t => t === type).length;
        const needToAdd = Math.max(0, typeConfig.minCount - currentCount);
        console.log(
          `${type}: current=${currentCount}, minCount=${typeConfig.minCount}, needToAdd=${needToAdd}, maxCount=${typeConfig.maxCount}`
        );
        for (let i = 0; i < needToAdd; i++) {
          eventTypes.push(type);
          priorityEvents.push(type); // Track priority events
        }
      }
    });
    console.log('After min count:', eventTypes);

    // Fill remaining slots based on weights, respecting maxCount
    const remainingSlots = totalEvents - eventTypes.length;
    console.log(
      `Phase 3: Filling ${remainingSlots} remaining slots with weighted distribution`
    );
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

        // After adding, check if this type has reached its maxCount
        const newCount = eventTypes.filter(t => t === randomType).length;
        if (newCount >= maxCount) {
          // Remove ALL instances of this type from weightedTypes to prevent further selection
          for (let k = weightedTypes.length - 1; k >= 0; k--) {
            if (weightedTypes[k] === randomType) {
              weightedTypes.splice(k, 1);
            }
          }
        }
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

    console.log('=== Final Distribution ===');
    const finalCounts: { [key: string]: number } = {};
    finalEventTypes.forEach(type => {
      finalCounts[type] = (finalCounts[type] || 0) + 1;
    });
    console.log('Final counts:', finalCounts);
    console.log('Final array:', finalEventTypes);

    return finalEventTypes;
  }

  private selectEventTypesForLayer(
    availableEvents: EventType[],
    branchCount: number,
    layer: number,
    eventTypeConfig: any,
    usedEventCounts: { [key: string]: number }
  ): EventType[] {
    console.log(
      `Layer ${layer}: Selecting ${branchCount} events from available:`,
      availableEvents
    );

    const selectedTypes: EventType[] = [];

    // Simply take events from the distributed array in order
    for (let i = 0; i < branchCount; i++) {
      let selectedType: EventType = 'unknown';
      let found = false;

      console.log(
        `  Branch ${i}: Looking for event from available:`,
        availableEvents
      );

      // Look for a suitable event in the available events
      for (let j = 0; j < availableEvents.length; j++) {
        const candidateType = availableEvents[j];

        // Check if elite_monster is too close to start
        if (candidateType === 'elite_monster' && layer <= 2) {
          console.log(
            `  Branch ${i}: Skipping ${candidateType} - too close to start`
          );
          continue; // Skip this event for now
        }

        // Found a suitable event
        selectedType = candidateType;
        availableEvents.splice(j, 1); // Remove it from the array
        found = true;
        console.log(`  Branch ${i}: Selected from array: ${selectedType}`);
        break;
      }

      // If no suitable event found, take any event (including elite_monster if necessary)
      if (!found && availableEvents.length > 0) {
        selectedType = availableEvents.shift()!;
        console.log(`  Branch ${i}: Force selected: ${selectedType}`);
      }

      if (!found && availableEvents.length === 0) {
        // Find an alternative that respects maxCount
        selectedType = this.findAlternativeEvent(
          eventTypeConfig,
          usedEventCounts,
          layer
        );
        console.log(
          `  Branch ${i}: Array exhausted, using alternative: ${selectedType}`
        );
      }

      selectedTypes.push(selectedType);
      // Update used count immediately
      usedEventCounts[selectedType] = (usedEventCounts[selectedType] || 0) + 1;
      console.log(
        `  Branch ${i}: Final selection: ${selectedType}, new count: ${usedEventCounts[selectedType]}`
      );
    }

    // If we couldn't get enough events from the available array,
    // we need to find alternatives that respect maxCount
    console.log(
      `Need ${branchCount} events, have ${selectedTypes.length}, finding alternatives...`
    );
    while (selectedTypes.length < branchCount) {
      let foundAlternative = false;
      console.log(
        `Alternative search: need ${branchCount - selectedTypes.length} more events`
      );

      // Try to find an event type that hasn't reached its maxCount
      for (const eventType of Object.keys(eventTypeConfig) as EventType[]) {
        const config = eventTypeConfig[eventType];
        const maxCount = config.maxCount || 999; // Default to high number if no maxCount
        const currentUsed = usedEventCounts[eventType] || 0;

        console.log(
          `Checking ${eventType}: currentUsed=${currentUsed}, maxCount=${maxCount}`
        );

        if (currentUsed < maxCount) {
          // Check if elite_monster is too close to start
          if (eventType === 'elite_monster' && layer <= 2) {
            console.log(
              `Skipping ${eventType} - too close to start (layer ${layer})`
            );
            continue;
          }

          console.log(`Selected alternative: ${eventType}`);
          selectedTypes.push(eventType);
          // Update used count immediately
          usedEventCounts[eventType] = (usedEventCounts[eventType] || 0) + 1;
          foundAlternative = true;
          break;
        } else {
          console.log(
            `${eventType} has reached maxCount (${currentUsed}/${maxCount})`
          );
        }
      }

      // If no alternative found, we're truly stuck - break to avoid infinite loop
      if (!foundAlternative) {
        console.warn(
          `Could not find suitable events for layer ${layer}, needed ${branchCount}, got ${selectedTypes.length}`
        );
        break;
      }
    }

    console.log(`Layer ${layer} selected:`, selectedTypes);
    console.log(`Remaining events after layer ${layer}:`, availableEvents);
    console.log(`Current used counts:`, usedEventCounts);

    return selectedTypes;
  }

  private findAlternativeEvent(
    eventTypeConfig: any,
    usedEventCounts: { [key: string]: number },
    layer: number
  ): EventType {
    // Build weighted array of available event types
    const weightedTypes: EventType[] = [];

    for (const eventType of Object.keys(eventTypeConfig) as EventType[]) {
      const config = eventTypeConfig[eventType];
      const maxCount = config.maxCount || 999;
      const currentUsed = usedEventCounts[eventType] || 0;
      const weight = config.weight || 0;

      if (currentUsed < maxCount && weight > 0) {
        // Check if elite_monster is too close to start
        if (eventType === 'elite_monster' && layer <= 2) {
          continue;
        }

        // Add to weighted array
        for (let i = 0; i < weight; i++) {
          weightedTypes.push(eventType as EventType);
        }
      }
    }

    // Select randomly from weighted array
    if (weightedTypes.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedTypes.length);
      const selected = weightedTypes[randomIndex];
      console.log(
        `Alternative selection: ${selected} from ${weightedTypes.length} weighted options`
      );
      return selected;
    }

    // If no weighted options available, try any event type that hasn't reached maxCount
    for (const eventType of Object.keys(eventTypeConfig) as EventType[]) {
      const config = eventTypeConfig[eventType];
      const maxCount = config.maxCount || 999;
      const currentUsed = usedEventCounts[eventType] || 0;

      if (currentUsed < maxCount) {
        if (eventType === 'elite_monster' && layer <= 2) {
          continue;
        }
        console.log(`Fallback selection: ${eventType} (no weight available)`);
        return eventType as EventType;
      }
    }

    // If all event types have reached maxCount, return 'unknown' as last resort
    console.warn(
      'All event types have reached maxCount, using unknown as fallback'
    );
    return 'unknown';
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
