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
    const storyDisplay = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyDisplay || !choicesContainer) return;

    // Get current chapter for port pricing configuration
    let currentChapter = null;
    if (this.chaptersData) {
      currentChapter = this.chaptersData.chapters.find(
        chapter => chapter.id === this.gameState.currentChapter
      );
    }

    storyDisplay.innerHTML = `
      <h3>港に到着</h3>
      <p>賑やかな港に到着しました。ここでは船の修理、武器の購入、レリックの購入ができます。</p>
      <p>現在の資金: ${this.gameState.playerParameters.money}金</p>
      <p>船体の状態: ${this.gameState.playerParameters.hull}/${this.gameState.playerParameters.ship.hullMax}</p>
      <p>武器スロット: ${this.gameState.playerParameters.weapons.length}/${this.gameState.playerParameters.ship.weaponSlots}</p>
      <p>保管庫: ${this.gameState.playerParameters.relics.length}/${this.gameState.playerParameters.ship.storage}</p>
    `;

    choicesContainer.innerHTML = `
      <button class="choice-btn" onclick="window.gameInstance.portManager.repairShip()" ${
        this.gameState.playerParameters.hull >=
          this.gameState.playerParameters.ship.hullMax ||
        this.gameState.playerParameters.money < 10
          ? 'disabled'
          : ''
      }>
        🔧 船体を修復 (10金)
      </button>
      <button class="choice-btn" onclick="window.gameInstance.portManager.showPortWeapons()">
        ⚔️ 武器を購入
      </button>
      <button class="choice-btn" onclick="window.gameInstance.portManager.showPortRelics()">
        🏺 レリックを購入
      </button>
      <button class="choice-btn" onclick="window.gameInstance.portManager.leavePort()">
        ⛵ 港を出発する
      </button>
    `;
  }

  repairShip(): void {
    const storyDisplay = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyDisplay || !choicesContainer) return;

    if (
      this.gameState.playerParameters.hull >=
      this.gameState.playerParameters.ship.hullMax
    ) {
      storyDisplay.innerHTML = `
        <h3>船体修復</h3>
        <p>船体は既に完璧な状態です。修復の必要はありません。</p>
      `;
      choicesContainer.innerHTML = `
        <button class="choice-btn" onclick="window.gameInstance.portManager.returnToPort()">
          ⬅️ 港に戻る
        </button>
      `;
      return;
    }

    if (this.gameState.playerParameters.money < 10) {
      storyDisplay.innerHTML = `
        <h3>船体修復</h3>
        <p>資金が不足しています。修復には10金が必要です。</p>
      `;
      choicesContainer.innerHTML = `
        <button class="choice-btn" onclick="window.gameInstance.portManager.returnToPort()">
          ⬅️ 港に戻る
        </button>
      `;
      return;
    }

    // Perform repair
    this.gameState.playerParameters.money -= 10;
    this.gameState.playerParameters.hull =
      this.gameState.playerParameters.ship.hullMax;

    this.updateDisplayCallback();

    storyDisplay.innerHTML = `
      <h3>船体修復完了</h3>
      <p>船体が完全に修復されました！</p>
      <p>費用: 10金</p>
      <p>現在の船体: ${this.gameState.playerParameters.hull}/${this.gameState.playerParameters.ship.hullMax}</p>
      <p>残り資金: ${this.gameState.playerParameters.money}金</p>
    `;

    choicesContainer.innerHTML = '';

    // Return to port after delay
    setTimeout(() => this.returnToPort(), 1500);
  }

  showPortWeapons(): void {
    const storyDisplay = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyDisplay || !choicesContainer) return;

    storyDisplay.innerHTML = `
      <h3>武器商店</h3>
      <p>様々な武器が売られています。どれを購入しますか？</p>
      <p>現在の資金: ${this.gameState.playerParameters.money}金</p>
      <p>武器スロット: ${this.gameState.playerParameters.weapons.length}/${this.gameState.playerParameters.ship.weaponSlots}</p>
    `;

    const portWeapons = this.weaponManager.generatePortWeapons(3);

    choicesContainer.innerHTML = `
      <div class="port-weapons">
        ${portWeapons
          .map(
            (weapon, index) => `
          <div class="weapon-item">
            <h4>${weapon.name}</h4>
            <p>${weapon.description}</p>
            <p>ダメージ: ${weapon.damage.min}-${weapon.damage.max}</p>
            <p>命中率: ${weapon.accuracy}%</p>
            <p>クールダウン: ${weapon.cooldown.min}-${weapon.cooldown.max}秒</p>
            <p>クリティカル率: ${weapon.critRate}%</p>
            <p>クリティカル倍率: ${weapon.critMultiplier}x</p>
            <p>必要操舵: ${weapon.handlingReq}</p>
            <p class="weapon-price">価格: ${weapon.price}金</p>
            <button 
              class="choice-btn ${
                this.gameState.playerParameters.money < weapon.price ||
                this.gameState.playerParameters.weapons.length >=
                  this.gameState.playerParameters.ship.weaponSlots
                  ? 'disabled'
                  : ''
              }" 
              onclick="window.gameInstance.portManager.purchaseWeapon(${index})"
              ${
                this.gameState.playerParameters.money < weapon.price ||
                this.gameState.playerParameters.weapons.length >=
                  this.gameState.playerParameters.ship.weaponSlots
                  ? 'disabled'
                  : ''
              }
            >
              購入する
            </button>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    this.currentPortWeapons = portWeapons;

    choicesContainer.innerHTML += `
      <button class="choice-btn" onclick="window.gameInstance.portManager.returnToPort()">
        ⬅️ 港に戻る
      </button>
    `;
  }

  purchaseWeapon(index: number): void {
    if (!this.currentPortWeapons || !this.currentPortWeapons[index]) return;

    const weapon = this.currentPortWeapons[index];
    const storyDisplay = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyDisplay || !choicesContainer) return;

    if (this.gameState.playerParameters.money < weapon.price) {
      storyDisplay.innerHTML = `
        <h3>購入失敗</h3>
        <p>資金が不足しています。</p>
      `;
      return;
    }

    if (
      this.gameState.playerParameters.weapons.length >=
      this.gameState.playerParameters.ship.weaponSlots
    ) {
      storyDisplay.innerHTML = `
        <h3>購入失敗</h3>
        <p>武器スロットが満杯です。</p>
      `;
      return;
    }

    // Purchase weapon
    this.gameState.playerParameters.money -= weapon.price;
    this.gameState.playerParameters.weapons.push(weapon);
    this.updateDisplayCallback();

    storyDisplay.innerHTML = `
      <h3>武器購入完了</h3>
      <p>${weapon.name}を購入しました！</p>
      <p>残り資金: ${this.gameState.playerParameters.money}金</p>
    `;

    choicesContainer.innerHTML = '';

    // Return to port after delay
    setTimeout(() => this.returnToPort(), 1500);
  }

  showPortRelics(): void {
    const storyDisplay = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyDisplay || !choicesContainer) return;

    storyDisplay.innerHTML = `
      <h3>レリック商店</h3>
      <p>古代の秘宝が売られています。どれを購入しますか？</p>
      <p>現在の資金: ${this.gameState.playerParameters.money}金</p>
      <p>保管庫: ${this.gameState.playerParameters.relics.length}/${this.gameState.playerParameters.ship.storage}</p>
    `;

    const portRelics = this.relicManager.generateMultipleRelics(3);

    choicesContainer.innerHTML = `
      <div class="port-relics">
        ${portRelics
          .map(
            (relic, index) => `
          <div class="relic-item ${relic.rarity}">
            <h4>${relic.name}</h4>
            <p>${relic.description}</p>
            <p class="relic-rarity">レア度: ${relic.rarity}</p>
            <div class="relic-effects">
              ${relic.effects
                .map(
                  effect =>
                    `<div class="effect ${
                      effect.isLegendary ? 'legendary' : ''
                    }">${effect.description}</div>`
                )
                .join('')}
            </div>
            <p class="relic-price">価格: ${relic.price || 50}金</p>
            <button 
              class="choice-btn ${
                this.gameState.playerParameters.money < (relic.price || 50) ||
                this.gameState.playerParameters.relics.length >=
                  this.gameState.playerParameters.ship.storage
                  ? 'disabled'
                  : ''
              }" 
              onclick="window.gameInstance.portManager.purchaseRelic(${index})"
              ${
                this.gameState.playerParameters.money < (relic.price || 50) ||
                this.gameState.playerParameters.relics.length >=
                  this.gameState.playerParameters.ship.storage
                  ? 'disabled'
                  : ''
              }
            >
              購入する
            </button>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    this.currentPortRelics = portRelics;

    choicesContainer.innerHTML += `
      <button class="choice-btn" onclick="window.gameInstance.portManager.returnToPort()">
        ⬅️ 港に戻る
      </button>
    `;
  }

  purchaseRelic(index: number): void {
    if (!this.currentPortRelics || !this.currentPortRelics[index]) return;

    const relic = this.currentPortRelics[index];
    const storyDisplay = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');

    if (!storyDisplay || !choicesContainer) return;

    if (this.gameState.playerParameters.money < (relic.price || 50)) {
      storyDisplay.innerHTML = `
        <h3>購入失敗</h3>
        <p>資金が不足しています。</p>
      `;
      return;
    }

    if (
      this.gameState.playerParameters.relics.length >=
      this.gameState.playerParameters.ship.storage
    ) {
      storyDisplay.innerHTML = `
        <h3>購入失敗</h3>
        <p>保管庫が満杯です。</p>
      `;
      return;
    }

    // Purchase relic
    this.gameState.playerParameters.money -= relic.price || 50;
    this.gameState.playerParameters.relics.push(relic);
    this.updateDisplayCallback();

    storyDisplay.innerHTML = `
      <h3>レリック購入完了</h3>
      <p>${relic.name}を購入しました！</p>
      <p>残り資金: ${this.gameState.playerParameters.money}金</p>
    `;

    choicesContainer.innerHTML = '';

    // Return to port after delay
    setTimeout(() => this.returnToPort(), 1500);
  }

  returnToPort(): void {
    // Return to the main port screen
    this.handlePortEvent();
  }

  leavePort(): void {
    // Complete the port event
    this.gameState.eventsCompleted++;
    this.gameState.gamePhase = 'navigation';
    this.updateDisplayCallback();
    this.completeEventCallback();
  }
}
