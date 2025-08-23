import {
  GameData,
  GameState,
  Scene,
  Choice,
  SaveData,
  ActionType,
  PlayerParameters,
  Ship,
} from "./types.js";

export class MistvoyageGame {
  private gameData: GameData | null = null;
  private currentScene: Scene | null = null;
  private gameState: GameState = {
    currentSceneId: "start",
    variables: {},
    visitedScenes: new Set(),
    playerParameters: this.initializePlayerParameters(),
  };

  constructor() {
    this.init();
  }

  private initializePlayerParameters(): PlayerParameters {
    const initialShip: Ship = {
      name: "初期の船",
      hullMax: 100,
      crewMax: 10,
      speed: 5,
      storage: 8,
      weaponSlots: 2,
      weapons: ["Harpoon"],
      specialRules: [],
    };

    return {
      // Public parameters
      ship: initialShip,
      hull: initialShip.hullMax,
      storage: initialShip.storage,
      food: 20,
      money: 50,
      crew: initialShip.crewMax,
      sight: 10,
      weather: "晴れ",
      relics: [],
      weaponSlots: initialShip.weaponSlots,
      weapons: [...initialShip.weapons],

      // Private parameters
      speed: initialShip.speed,
      karma: 0,
    };
  }

  private async init(): Promise<void> {
    try {
      await this.loadGameData();
      this.setupEventListeners();
      this.startGame();
    } catch (error) {
      console.error("ゲーム初期化エラー:", error);
      this.showError("ゲームデータの読み込みに失敗しました");
    }
  }

  private async loadGameData(): Promise<void> {
    const response = await fetch("data/game.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    this.gameData = await response.json();
  }

  private setupEventListeners(): void {
    const saveBtn = document.getElementById("save-btn");
    const loadBtn = document.getElementById("load-btn");
    const settingsBtn = document.getElementById("settings-btn");

    if (saveBtn) saveBtn.addEventListener("click", () => this.saveGame());
    if (loadBtn) loadBtn.addEventListener("click", () => this.loadGame());
    if (settingsBtn)
      settingsBtn.addEventListener("click", () => this.showSettings());
  }

  private startGame(): void {
    this.loadScene(this.gameState.currentSceneId);
  }

  private loadScene(sceneId: string): void {
    if (!this.gameData) {
      console.error("ゲームデータが読み込まれていません");
      return;
    }

    const scene = this.gameData.scenes[sceneId];
    if (!scene) {
      console.error(`シーン '${sceneId}' が見つかりません`);
      return;
    }

    this.currentScene = scene;
    this.gameState.currentSceneId = sceneId;
    this.gameState.visitedScenes.add(sceneId);

    this.displayScene();
    this.updateStatusBar();
    this.updateParameterDisplay();
  }

  private displayScene(): void {
    if (!this.currentScene) return;

    const storyText = document.getElementById("story-text");
    const choicesContainer = document.getElementById("choices-container");

    if (!storyText || !choicesContainer) {
      console.error("必要なDOM要素が見つかりません");
      return;
    }

    // ストーリーテキストを表示
    storyText.innerHTML = this.processText(this.currentScene.text);

    // 選択肢をクリア
    choicesContainer.innerHTML = "";

    // 選択肢を表示
    if (this.currentScene.choices) {
      this.currentScene.choices.forEach((choice: Choice) => {
        if (this.checkCondition(choice.condition)) {
          const choiceBtn = document.createElement("button");
          choiceBtn.className = "choice-btn";
          choiceBtn.textContent = choice.text;
          choiceBtn.addEventListener("click", () => this.selectChoice(choice));
          choicesContainer.appendChild(choiceBtn);
        }
      });
    }
  }

  private processText(text: string): string {
    // 変数置換などのテキスト処理
    return text.replace(/\{\{(\w+)\}\}/g, (match: string, varName: string) => {
      return this.gameState.variables[varName] || match;
    });
  }

  private checkCondition(condition?: string): boolean {
    if (!condition) return true;

    // 簡単な条件チェック (例: variable_name:value)
    const [varName, expectedValue] = condition.split(":");
    return this.gameState.variables[varName] == expectedValue;
  }

  private selectChoice(choice: Choice): void {
    // アクションを実行
    if (choice.actions) {
      choice.actions.forEach((action: string) => this.executeAction(action));
    }

    // 次のシーンに移動
    if (choice.nextScene) {
      this.loadScene(choice.nextScene);
    }
  }

  private executeAction(action: string): void {
    const [actionType, ...params] = action.split(":");

    switch (actionType as ActionType) {
      case "set":
        const [varName, value] = params;
        this.gameState.variables[varName] = value;
        break;
      case "add":
        const [addVar, addValue] = params;
        this.gameState.variables[addVar] =
          (this.gameState.variables[addVar] || 0) + parseInt(addValue);
        break;
      default:
        console.warn(`未知のアクション: ${actionType}`);
    }
  }

  private updateStatusBar(): void {
    const currentSceneElement = document.getElementById("current-scene");
    if (currentSceneElement) {
      currentSceneElement.textContent = `シーン: ${this.gameState.currentSceneId}`;
    }
  }

  private updateParameterDisplay(): void {
    const params = this.gameState.playerParameters;

    // Update public parameters display
    this.updateParameterElement(
      "hull-display",
      `船体: ${params.hull}/${params.ship.hullMax}`
    );
    this.updateParameterElement("food-display", `食料: ${params.food}`);
    this.updateParameterElement("money-display", `資金: ${params.money}`);
    this.updateParameterElement(
      "crew-display",
      `乗組員: ${params.crew}/${params.ship.crewMax}`
    );
    this.updateParameterElement("sight-display", `視界: ${params.sight}`);
    this.updateParameterElement("weather-display", `天候: ${params.weather}`);
    this.updateParameterElement(
      "storage-display",
      `保管庫: ${params.relics.length}/${params.storage}`
    );
    this.updateParameterElement(
      "weapons-display",
      `武器: ${params.weapons.join(", ")}`
    );
  }

  private updateParameterElement(id: string, text: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  private saveGame(): void {
    try {
      const saveData: SaveData = {
        gameState: {
          currentSceneId: this.gameState.currentSceneId,
          variables: this.gameState.variables,
          visitedScenes: Array.from(this.gameState.visitedScenes),
          playerParameters: this.gameState.playerParameters,
        },
        timestamp: Date.now(),
      };

      localStorage.setItem("mistvoyage_save", JSON.stringify(saveData));
      this.showSaveStatus("セーブしました");
    } catch (error) {
      console.error("セーブエラー:", error);
      this.showSaveStatus("セーブに失敗しました", true);
    }
  }

  private loadGame(): void {
    try {
      const saveData = localStorage.getItem("mistvoyage_save");
      if (!saveData) {
        this.showSaveStatus("セーブデータがありません", true);
        return;
      }

      const parsed: SaveData = JSON.parse(saveData);
      this.gameState = {
        currentSceneId: parsed.gameState.currentSceneId,
        variables: parsed.gameState.variables,
        visitedScenes: new Set(parsed.gameState.visitedScenes),
        playerParameters: parsed.gameState.playerParameters,
      };

      this.loadScene(this.gameState.currentSceneId);
      this.showSaveStatus("ロードしました");
    } catch (error) {
      console.error("ロードエラー:", error);
      this.showSaveStatus("ロードに失敗しました", true);
    }
  }

  private showSaveStatus(message: string, isError: boolean = false): void {
    const statusElement = document.getElementById("save-status");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = isError ? "#ff6666" : "#66ccff";

      setTimeout(() => {
        statusElement.textContent = "";
      }, 3000);
    }
  }

  private showSettings(): void {
    alert("設定画面（未実装）");
  }

  private showError(message: string): void {
    const storyText = document.getElementById("story-text");
    if (storyText) {
      storyText.innerHTML = `<p style="color: #ff6666;">エラー: ${message}</p>`;
    }
  }
}

// ゲーム開始
document.addEventListener("DOMContentLoaded", () => {
  new MistvoyageGame();
});
