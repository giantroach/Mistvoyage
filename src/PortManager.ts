import { GameState, Relic, Weapon, ChaptersData } from './types.js';
import { RelicManager } from './RelicManager.js';
import { WeaponManager } from './WeaponManager.js';

export class PortManager {
  private gameState: GameState;
  private relicManager: RelicManager;
  private weaponManager: WeaponManager;
  private chaptersData: ChaptersData | null = null;
  private updateDisplayCallback: () => void;
  private completeEventCallback: () => void;
  private currentPortWeapons: Weapon[] = [];
  private currentPortRelics: Relic[] = [];

  constructor(
    gameState: GameState,
    relicManager: RelicManager,
    weaponManager: WeaponManager,
    updateDisplayCallback: () => void,
    completeEventCallback: () => void
  ) {
    this.gameState = gameState;
    this.relicManager = relicManager;
    this.weaponManager = weaponManager;
    this.updateDisplayCallback = updateDisplayCallback;
    this.completeEventCallback = completeEventCallback;
  }

  setChaptersData(chaptersData: ChaptersData): void {
    this.chaptersData = chaptersData;
  }

  handlePortEvent(): void {
    // Port UI is now handled by Vue components
    // This method exists for compatibility but doesn't need to do DOM manipulation
    console.log('Port event handled - UI is managed by Vue components');
  }

  repairShip(): void {
    if (
      this.gameState.playerParameters.hull >=
      this.gameState.playerParameters.ship.hullMax
    ) {
      return; // Already at full hull
    }

    if (this.gameState.playerParameters.money < 10) {
      return; // Not enough money
    }

    // Perform repair
    this.gameState.playerParameters.money -= 10;
    this.gameState.playerParameters.hull =
      this.gameState.playerParameters.ship.hullMax;

    this.updateDisplayCallback();
  }

  generatePortWeapons(): Weapon[] {
    const portWeapons = this.weaponManager.generatePortWeapons(3);
    this.currentPortWeapons = portWeapons;
    return portWeapons;
  }

  purchaseWeapon(index: number): boolean {
    if (!this.currentPortWeapons || !this.currentPortWeapons[index])
      return false;

    const weapon = this.currentPortWeapons[index];

    if (this.gameState.playerParameters.money < weapon.price) {
      return false; // Not enough money
    }

    if (
      this.gameState.playerParameters.weapons.length >=
      this.gameState.playerParameters.ship.weaponSlots
    ) {
      return false; // No weapon slots
    }

    // Purchase weapon
    this.gameState.playerParameters.money -= weapon.price;
    this.gameState.playerParameters.weapons.push(weapon);
    this.updateDisplayCallback();

    return true;
  }

  generatePortRelics(): Relic[] {
    const portRelics = this.relicManager.generateMultipleRelics(3);
    this.currentPortRelics = portRelics;
    return portRelics;
  }

  purchaseRelic(index: number): boolean {
    if (!this.currentPortRelics || !this.currentPortRelics[index]) return false;

    const relic = this.currentPortRelics[index];
    const price = relic.price || 50;

    if (this.gameState.playerParameters.money < price) {
      return false; // Not enough money
    }

    if (
      this.gameState.playerParameters.relics.length >=
      this.gameState.playerParameters.ship.storage
    ) {
      return false; // No storage space
    }

    // Purchase relic
    this.gameState.playerParameters.money -= price;
    this.gameState.playerParameters.relics.push(relic);
    this.updateDisplayCallback();

    return true;
  }

  leavePort(): void {
    // Complete the port event
    this.gameState.eventsCompleted++;
    this.gameState.gamePhase = 'navigation';
    this.updateDisplayCallback();
    this.completeEventCallback();
  }
}
