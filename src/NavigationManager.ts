import { GameState, MapNode } from './types';
import { DisplayManager } from './DisplayManager';

export class NavigationManager {
  private pendingScrollInfo: any = null;

  constructor(
    private gameState: GameState,
    private displayManager: DisplayManager
  ) {}

  public navigateToNode(
    nodeId: string,
    updateDisplayCallback: () => void
  ): boolean {
    // Check if navigation is valid (only accessible nodes can be selected)
    const node = this.gameState.currentMap.nodes[nodeId];
    if (
      !node ||
      !node.isAccessible ||
      this.gameState.gamePhase !== 'navigation'
    ) {
      console.log(
        `Navigation to ${nodeId} not allowed: accessible=${node?.isAccessible}, phase=${this.gameState.gamePhase}`
      );
      return false;
    }

    this.gameState.currentNodeId = nodeId;
    this.gameState.visitedNodes.add(nodeId);

    // Store the target node info for scrolling
    const targetNode = this.gameState.currentMap.nodes[nodeId];
    const targetScrollLeft = targetNode ? targetNode.layer * 250 : 0;

    // Handle events
    if (node && node.eventType) {
      this.gameState.gamePhase = 'event';

      // Set up scroll for after event processing
      this.pendingScrollInfo = {
        targetNodeId: nodeId,
        targetScrollLeft: targetScrollLeft,
      };

      return true; // Caller handles event processing
    }

    // No event - update visibility and handle scroll immediately
    this.updateNodeVisibility();
    this.gameState.gamePhase = 'navigation';

    // Check if we already have a map container visible
    const existingMapContainer = document.querySelector(
      '.map-container.scrollable'
    ) as HTMLElement;

    if (existingMapContainer && this.gameState.gamePhase === 'navigation') {
      this.handleExistingContainerScroll(targetScrollLeft);
    } else {
      // No existing map container - signal caller to use normal display update
      this.pendingScrollInfo = {
        targetNodeId: nodeId,
        targetScrollLeft: targetScrollLeft,
      };
      updateDisplayCallback();
    }

    return true;
  }

  public getPendingScrollInfo(): any {
    return this.pendingScrollInfo;
  }

  public clearPendingScrollInfo(): void {
    this.pendingScrollInfo = null;
  }

  private handleExistingContainerScroll(targetScrollLeft: number): void {
    // We already have navigation display - just update map and scroll directly
    console.log('NavigationManager: Direct scroll to existing container');

    const mapDisplay = document.getElementById('map-display');
    const existingMapContainer = document.querySelector(
      '.map-container.scrollable'
    ) as HTMLElement;

    if (mapDisplay && existingMapContainer) {
      // Save current scroll position before updating
      const currentScrollPos = existingMapContainer.scrollLeft;

      const sightRange = Math.min(
        3,
        Math.max(1, Math.floor(this.gameState.playerParameters.sight / 5))
      );

      // Temporarily hide the map to prevent flash during update
      mapDisplay.style.visibility = 'hidden';

      // Update map content
      mapDisplay.innerHTML = this.displayManager.generateMapDisplay(
        this.gameState,
        sightRange
      );

      // Find the updated map container and restore/animate scroll
      const updatedMapContainer = document.querySelector(
        '.map-container.scrollable'
      ) as HTMLElement;
      if (updatedMapContainer) {
        // Disable animations, restore position, then enable animations
        updatedMapContainer.style.scrollBehavior = 'auto';
        updatedMapContainer.scrollLeft = currentScrollPos;

        // Clear any existing scroll listeners and add new one
        updatedMapContainer.addEventListener('scroll', () => {
          this.gameState.mapScrollPosition = updatedMapContainer.scrollLeft;
        });

        // Make visible and then animate to target
        mapDisplay.style.visibility = 'visible';

        setTimeout(() => {
          updatedMapContainer.style.scrollBehavior = '';
          updatedMapContainer.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth',
          });

          console.log(
            'NavigationManager: Scrolled directly to:',
            targetScrollLeft
          );
        }, 10);
      }
    }
  }

  public updateNodeVisibility(): void {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    if (!currentNode) return;

    const visibleNodes = this.getVisibleNodes(currentNode);

    for (const nodeId in this.gameState.currentMap.nodes) {
      const node = this.gameState.currentMap.nodes[nodeId];

      // Set visibility based on sight range
      if (visibleNodes.includes(nodeId)) {
        node.isVisible = true;
      }

      // Set accessibility based on connections from current node
      if (currentNode.connections.includes(nodeId)) {
        // Node is directly connected to current node
        node.isAccessible = true;
      } else if (node.id === 'boss') {
        // Boss node has special accessibility rules
        node.isAccessible = this.isBossAccessible();
        node.isVisible = true;
      } else {
        // Not connected to current node
        node.isAccessible = false;
      }

      // Current node should not be clickable
      if (nodeId === this.gameState.currentNodeId) {
        node.isAccessible = false;
      }
    }
  }

  private getVisibleNodes(currentNode: MapNode): string[] {
    const sightRange = Math.max(
      1,
      Math.floor(this.gameState.playerParameters.sight / 5)
    );
    const visibleNodes = [this.gameState.currentNodeId];

    for (const nodeId in this.gameState.currentMap.nodes) {
      const node = this.gameState.currentMap.nodes[nodeId];
      if (Math.abs(node.layer - currentNode.layer) <= sightRange) {
        visibleNodes.push(nodeId);
      }
    }

    return visibleNodes;
  }

  private isBossAccessible(): boolean {
    // Check if chapter is complete
    const requiredEvents = 3; // This should come from chapter config
    return this.gameState.eventsCompleted >= requiredEvents;
  }

  public showNavigation(
    content: HTMLElement,
    choicesContainer: HTMLElement,
    isMapVisible: boolean
  ): void {
    const currentNode =
      this.gameState.currentMap.nodes[this.gameState.currentNodeId];
    const sightRange = Math.min(
      3,
      Math.max(1, Math.floor(this.gameState.playerParameters.sight / 5))
    );

    // Check if the navigation display already exists
    const existingNavigation =
      content.querySelector('h2')?.textContent === '航海中';
    const existingMapContainer = document.querySelector(
      '.map-container.scrollable'
    ) as HTMLElement;

    if (existingNavigation && existingMapContainer && this.pendingScrollInfo) {
      this.handleExistingNavigationUpdate(sightRange, this.pendingScrollInfo);
      this.clearPendingScrollInfo();
      return;
    }

    // Save current scroll position to game state before map regeneration
    if (existingMapContainer) {
      this.gameState.mapScrollPosition = existingMapContainer.scrollLeft;
      console.log(
        'NavigationManager: Saved scroll position to gameState:',
        this.gameState.mapScrollPosition
      );
    } else {
      console.log(
        'NavigationManager: No existing mapContainer found, using saved position:',
        this.gameState.mapScrollPosition || 0
      );
    }

    const currentScrollLeft = this.gameState.mapScrollPosition || 0;

    content.innerHTML = `
      <h2>航海中</h2>
      <p>船は穏やかに海を進んでいます。マップ上のアクセス可能なノードをクリックして次の目的地を選択してください。</p>
      <div id="map-display" class="${
        isMapVisible ? 'visible' : 'hidden'
      }" style="visibility: hidden;">
        ${
          isMapVisible
            ? this.displayManager.generateMapDisplay(this.gameState, sightRange)
            : ''
        }
      </div>
    `;

    this.handleScrollPositionAfterCreation(
      currentScrollLeft,
      this.pendingScrollInfo
    );

    // Clear pending scroll info after handling
    this.clearPendingScrollInfo();
    this.addNavigationInstructions(choicesContainer, currentNode);
  }

  private handleExistingNavigationUpdate(
    sightRange: number,
    pendingScrollInfo: any
  ): void {
    console.log(
      'NavigationManager: Using existing map container for smooth scroll'
    );

    const mapDisplay = document.getElementById('map-display');
    if (mapDisplay) {
      mapDisplay.innerHTML = this.displayManager.generateMapDisplay(
        this.gameState,
        sightRange
      );

      const newMapContainer = document.querySelector(
        '.map-container.scrollable'
      ) as HTMLElement;
      if (newMapContainer) {
        newMapContainer.replaceWith(newMapContainer.cloneNode(true));
        const cleanMapContainer = document.querySelector(
          '.map-container.scrollable'
        ) as HTMLElement;

        cleanMapContainer.addEventListener('scroll', () => {
          this.gameState.mapScrollPosition = cleanMapContainer.scrollLeft;
        });

        console.log(
          'NavigationManager: Smooth scrolling to:',
          pendingScrollInfo.targetScrollLeft
        );

        cleanMapContainer.scrollTo({
          left: pendingScrollInfo.targetScrollLeft,
          behavior: 'smooth',
        });
      }
    }
  }

  private handleScrollPositionAfterCreation(
    currentScrollLeft: number,
    pendingScrollInfo: any
  ): void {
    setTimeout(() => {
      const newMapContainer = document.querySelector(
        '.map-container.scrollable'
      ) as HTMLElement;
      const mapDisplay = document.getElementById('map-display');

      if (newMapContainer && mapDisplay) {
        newMapContainer.addEventListener('scroll', () => {
          this.gameState.mapScrollPosition = newMapContainer.scrollLeft;
        });

        if (pendingScrollInfo) {
          console.log('NavigationManager: Handling node navigation scroll');
          console.log(
            'NavigationManager: Restoring to position:',
            currentScrollLeft,
            'then animating to:',
            pendingScrollInfo.targetScrollLeft
          );

          newMapContainer.style.scrollBehavior = 'auto';
          newMapContainer.scrollLeft = currentScrollLeft;
          mapDisplay.style.visibility = 'visible';

          setTimeout(() => {
            newMapContainer.style.scrollBehavior = '';
            newMapContainer.scrollTo({
              left: pendingScrollInfo.targetScrollLeft,
              behavior: 'smooth',
            });
          }, 20);
        } else {
          console.log(
            'NavigationManager: Restoring scroll position to:',
            currentScrollLeft
          );

          newMapContainer.style.scrollBehavior = 'auto';
          newMapContainer.scrollLeft = currentScrollLeft;
          mapDisplay.style.visibility = 'visible';

          setTimeout(() => {
            newMapContainer.style.scrollBehavior = '';
          }, 20);
        }
      }
    }, 10);
  }

  private addNavigationInstructions(
    choicesContainer: HTMLElement,
    currentNode: MapNode | undefined
  ): void {
    choicesContainer.innerHTML = '';

    const currentNodeInfo = currentNode
      ? this.getEventTypeName(currentNode.eventType || 'unknown')
      : '不明';
    const instructionText = document.createElement('p');
    instructionText.innerHTML = `
      <strong>現在地:</strong> ${currentNodeInfo}<br>
      <strong>指示:</strong> マップ上の<span style="color: #66ff66;">緑色</span>のノードをクリックして移動してください。
    `;
    instructionText.style.color = '#ccc';
    instructionText.style.backgroundColor = '#2a2a2a';
    instructionText.style.padding = '1rem';
    instructionText.style.borderRadius = '4px';
    instructionText.style.border = '1px solid #444';
    choicesContainer.appendChild(instructionText);
  }

  private getEventTypeName(eventType: string): string {
    switch (eventType) {
      case 'monster':
        return 'モンスター遭遇';
      case 'elite_monster':
        return 'エリートモンスター';
      case 'treasure':
        return '宝箱';
      case 'shop':
        return '商人';
      case 'event':
        return 'イベント';
      case 'boss':
        return 'ボス';
      default:
        return '不明';
    }
  }
}
