<template>
  <div
    class="map-container scrollable"
    ref="mapContainer"
    @scroll="handleScroll"
  >
    <h3>周辺の海域</h3>

    <!-- SVG Connections -->
    <svg
      class="map-connections"
      xmlns="http://www.w3.org/2000/svg"
      :width="totalWidth"
      :height="mapHeight"
      :viewBox="`0 0 ${totalWidth} ${mapHeight}`"
    >
      <line
        v-for="connection in connections"
        :key="connection.key"
        :x1="connection.x1"
        :y1="connection.y1"
        :x2="connection.x2"
        :y2="connection.y2"
        :class="connection.class"
        :stroke="connection.strokeColor"
        :stroke-width="connection.strokeWidth"
        :opacity="connection.opacity"
      />
    </svg>

    <!-- Map Layers -->
    <div
      v-for="(layerData, layerIndex) in layers"
      :key="layerData.layer"
      class="map-layer"
      :style="{ left: layerIndex * layerSpacing + layerPadding + 'px' }"
    >
      <div class="layer-label">レイヤー {{ layerData.layer }}</div>
      <div class="layer-nodes">
        <div
          v-for="(node, nodeIndex) in layerData.nodes"
          :key="node.id"
          :class="getNodeClass(node)"
          :title="getNodeDisplayName(node)"
          :style="getNodeStyle(node, nodeIndex, layerData.startY)"
          @click="handleNodeClick(node)"
        >
          <template v-if="isNodeUnknown(node)">
            {{ getUnknownNodeLabel(node) }}
          </template>
          <template v-else>
            {{ getNodeDisplayName(node) }}
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import type { GameState, MapNode } from '@/types';

interface Props {
  gameState: GameState;
  sightRange: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  navigateToNode: [nodeId: string];
  scrollUpdate: [scrollLeft: number];
}>();

const mapContainer = ref<HTMLElement>();

// Helper function to ensure visitedNodes is a Set
const getVisitedNodesSet = computed(() => {
  const visitedNodes = props.gameState.visitedNodes;
  if (visitedNodes instanceof Set) {
    return visitedNodes;
  }
  // If it's an array (from JSON serialization), convert to Set
  if (Array.isArray(visitedNodes)) {
    return new Set(visitedNodes);
  }
  // If it's an object with array-like structure, convert to Set
  if (visitedNodes && typeof visitedNodes === 'object') {
    return new Set(Object.values(visitedNodes));
  }
  // Fallback to empty Set
  return new Set<string>();
});

// Constants
const nodeWidth = 180;
const nodeHeight = 80;
const layerSpacing = 250;
const layerPadding = 50;
const mapHeight = 500;

// Get current node
const currentNode = computed(
  () => props.gameState.currentMap.nodes[props.gameState.currentNodeId]
);

// Group nodes by layer
const nodesByLayer = computed(() => {
  const result: { [layer: number]: MapNode[] } = {};
  Object.values(props.gameState.currentMap.nodes).forEach(node => {
    if (!result[node.layer]) {
      result[node.layer] = [];
    }
    result[node.layer].push(node);
  });
  return result;
});

// Calculate layers with positioning
const layers = computed(() => {
  const layerNumbers = Object.keys(nodesByLayer.value)
    .map(Number)
    .sort((a, b) => a - b);

  return layerNumbers.map(layer => {
    const layerNodes = nodesByLayer.value[layer];
    const totalLayerHeight =
      layerNodes.length * nodeHeight + (layerNodes.length - 1) * 20;
    const availableHeight = mapHeight - 80;
    const startY = (availableHeight - totalLayerHeight) / 2 + 40;

    return {
      layer,
      nodes: layerNodes,
      startY,
    };
  });
});

// Calculate node positions for connections
const nodePositions = computed(() => {
  const positions: {
    [nodeId: string]: {
      centerX: number;
      centerY: number;
      leftX: number;
      rightX: number;
      topY: number;
      bottomY: number;
    };
  } = {};

  layers.value.forEach((layerData, layerIndex) => {
    layerData.nodes.forEach((node, nodeIndex) => {
      const centerX = layerIndex * layerSpacing + layerPadding + nodeWidth / 2;
      const centerY =
        layerData.startY + nodeIndex * (nodeHeight + 20) + nodeHeight / 2;

      positions[node.id] = {
        centerX,
        centerY,
        leftX: centerX - nodeWidth / 2,
        rightX: centerX + nodeWidth / 2,
        topY: centerY - nodeHeight / 2,
        bottomY: centerY + nodeHeight / 2,
      };
    });
  });

  return positions;
});

// Calculate total width
const totalWidth = computed(() => {
  return Math.max(
    (layers.value.length - 1) * layerSpacing + layerPadding * 2 + nodeWidth,
    layers.value.length * layerSpacing + layerPadding * 2 + nodeWidth + 100
  );
});

// Calculate connections
const connections = computed(() => {
  const result: any[] = [];

  Object.values(props.gameState.currentMap.nodes).forEach(node => {
    if (
      !node.connections ||
      !node.connections.length ||
      !nodePositions.value[node.id]
    ) {
      return;
    }

    node.connections.forEach(connectedNodeId => {
      const connectedNode = props.gameState.currentMap.nodes[connectedNodeId];
      if (!connectedNode || !nodePositions.value[connectedNodeId]) return;

      const fromPos = nodePositions.value[node.id];
      const toPos = nodePositions.value[connectedNodeId];

      const isCurrentPath =
        (node.id === props.gameState.currentNodeId ||
          getVisitedNodesSet.value.has(node.id)) &&
        node.connections.includes(connectedNodeId);

      const fromDistance = Math.abs(node.layer - currentNode.value!.layer);
      const toDistance = Math.abs(
        connectedNode.layer - currentNode.value!.layer
      );
      const isDistantConnection = fromDistance >= 3 || toDistance >= 3;

      // Calculate connection points
      let x1, y1, x2, y2;

      if (node.layer === connectedNode.layer) {
        // Same layer connection
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
      } else {
        // Different layer connection
        x1 = fromPos.rightX;
        y1 = fromPos.centerY;
        x2 = toPos.leftX;
        y2 = toPos.centerY;
      }

      let connectionClass = 'map-connection';
      if (isCurrentPath) connectionClass += ' active';
      if (isDistantConnection) connectionClass += ' distant';

      const strokeWidth = isCurrentPath ? '3' : isDistantConnection ? '1' : '2';
      const strokeColor = isCurrentPath
        ? '#66ccff'
        : isDistantConnection
          ? '#999'
          : '#666';
      const opacity = isCurrentPath ? '1' : isDistantConnection ? '0.8' : '0.9';

      result.push({
        key: `${node.id}-${connectedNodeId}`,
        x1,
        y1,
        x2,
        y2,
        class: connectionClass,
        strokeWidth,
        strokeColor,
        opacity,
      });
    });
  });

  return result;
});

// Node styling and interaction methods
const getNodeClass = (node: MapNode) => {
  const isCurrentNode = node.id === props.gameState.currentNodeId;
  const isAccessible = node.isAccessible;
  const isVisited = getVisitedNodesSet.value.has(node.id);
  const layerDistance = Math.abs(node.layer - currentNode.value!.layer);

  let nodeClass = 'map-node';
  if (isCurrentNode) nodeClass += ' current';
  if (isAccessible) nodeClass += ' accessible';
  if (isVisited) nodeClass += ' visited';
  if (layerDistance > 2) nodeClass += ' distant';

  return nodeClass;
};

const isNodeUnknown = (node: MapNode) => {
  const layerDistance = Math.abs(node.layer - currentNode.value!.layer);
  const currentNodeLayer = currentNode.value?.layer;
  const isPastNode =
    currentNodeLayer !== undefined && node.layer < currentNodeLayer;
  const isVisited = getVisitedNodesSet.value.has(node.id);

  // 訪問済みノードは常に表示
  if (isVisited) {
    return !node.eventType;
  }

  // Sight値に基づく視界制限を適用
  const sight = props.gameState.playerParameters.sight;
  let visibilityRange;

  if (sight <= 5) {
    visibilityRange = 0; // 全て不明
  } else if (sight <= 10) {
    visibilityRange = 1; // 1つ先まで
  } else if (sight <= 15) {
    visibilityRange = 3; // 3つ先まで
  } else if (sight <= 20) {
    visibilityRange = 4; // 4つ先まで
  } else {
    visibilityRange = 5; // 5つ先まで
  }

  if (layerDistance > visibilityRange && !isPastNode) {
    return true;
  }

  return !node.eventType;
};

const getUnknownNodeLabel = (node: MapNode) => {
  const layerDistance = Math.abs(node.layer - currentNode.value!.layer);
  const currentNodeLayer = currentNode.value?.layer;
  const isPastNode =
    currentNodeLayer !== undefined && node.layer < currentNodeLayer;
  const isVisited = getVisitedNodesSet.value.has(node.id);

  // 訪問済みノードは常に表示（このメソッドは呼ばれないはず）
  if (isVisited) {
    return '視界不足';
  }

  // Sight値に基づく視界制限を適用
  const sight = props.gameState.playerParameters.sight;
  let visibilityRange;

  if (sight <= 5) {
    visibilityRange = 0; // 全て不明
  } else if (sight <= 10) {
    visibilityRange = 1; // 1つ先まで
  } else if (sight <= 15) {
    visibilityRange = 3; // 3つ先まで
  } else if (sight <= 20) {
    visibilityRange = 4; // 4つ先まで
  } else {
    visibilityRange = 5; // 5つ先まで
  }

  if (layerDistance > visibilityRange && !isPastNode) {
    return '遠方のため不明';
  }

  return '視界不足';
};

const getNodeDisplayName = (node: MapNode) => {
  const layerDistance = Math.abs(node.layer - currentNode.value!.layer);
  const currentNodeLayer = currentNode.value?.layer;
  const isPastNode =
    currentNodeLayer !== undefined && node.layer < currentNodeLayer;
  const isVisited = getVisitedNodesSet.value.has(node.id);

  // 訪問済みノードは常に表示
  if (isVisited && node.eventType) {
    return getEventTypeName(node.eventType);
  }

  // Sight値に基づく視界制限を適用
  const sight = props.gameState.playerParameters.sight;
  let visibilityRange;

  if (sight <= 5) {
    visibilityRange = 0; // 全て不明
  } else if (sight <= 10) {
    visibilityRange = 1; // 1つ先まで
  } else if (sight <= 15) {
    visibilityRange = 3; // 3つ先まで
  } else if (sight <= 20) {
    visibilityRange = 4; // 4つ先まで
  } else {
    visibilityRange = 5; // 5つ先まで
  }

  if (layerDistance > visibilityRange && !isPastNode) {
    return '';
  }

  return node.eventType ? getEventTypeName(node.eventType) : '';
};

const getEventTypeName = (eventType: string) => {
  switch (eventType) {
    case 'monster':
      return 'モンスター';
    case 'elite_monster':
      return 'エリートモンスター';
    case 'treasure':
      return '宝';
    case 'port':
      return '港';
    case 'temple':
      return '寺院';
    case 'boss':
      return 'ボス';
    case 'start':
      return 'スタート地点';
    case 'unknown':
      return '???';
    default:
      return '';
  }
};

const getNodeStyle = (node: MapNode, nodeIndex: number, startY: number) => {
  const nodeY = startY + nodeIndex * (nodeHeight + 20);
  const adjustedNodeWidth = nodeWidth - 4;
  const cursorStyle =
    node.isAccessible && props.gameState.gamePhase === 'navigation'
      ? 'cursor: pointer;'
      : '';

  return {
    position: 'absolute',
    top: nodeY + 'px',
    left: '2px',
    width: adjustedNodeWidth + 'px',
    height: nodeHeight + 'px',
    ...(cursorStyle && { cursor: 'pointer' }),
  };
};

const handleNodeClick = (node: MapNode) => {
  if (node.isAccessible && props.gameState.gamePhase === 'navigation') {
    emit('navigateToNode', node.id);
  }
};

const handleScroll = () => {
  if (mapContainer.value) {
    emit('scrollUpdate', mapContainer.value.scrollLeft);
  }
};

// Track if we're currently updating scroll position to prevent loops
let isUpdatingScroll = false;

// Watch for scroll position updates
watch(
  () => props.gameState.mapScrollPosition,
  newPosition => {
    if (mapContainer.value && newPosition !== undefined && !isUpdatingScroll) {
      isUpdatingScroll = true;
      mapContainer.value.scrollLeft = newPosition;
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingScroll = false;
      }, 50);
    }
  }
);
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 500px;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid #444;
  background-color: #1a1a1a;
}

.map-connections {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.map-layer {
  position: absolute;
  width: 180px;
  height: 100%;
}

.layer-label {
  text-align: center;
  font-size: 0.8rem;
  color: #888;
  padding: 0.25rem 0;
  background-color: #2a2a2a;
  border-radius: 4px 4px 0 0;
}

.layer-nodes {
  position: relative;
  height: calc(100% - 30px);
}

.map-node {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.8rem;
  border: 2px solid #444;
  border-radius: 6px;
  background-color: #2a2a2a;
  color: #ccc;
  transition: all 0.2s ease;
}

.map-node.current {
  background-color: #4a4a2a;
  border-color: #ffcc00;
  color: #fff;
  font-weight: bold;
}

.map-node.accessible {
  border-color: #66ff66;
  color: #66ff66;
  background-color: #2a4a2a;
}

.map-node.accessible:hover {
  background-color: #3a5a3a;
  border-color: #88ff88;
}

.map-node.visited {
  background-color: #3a3a4a;
  border-color: #6666cc;
  opacity: 0.8;
}

.map-node.distant {
  opacity: 0.6;
}
</style>
