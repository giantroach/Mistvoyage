class MistvoyageGame {
    constructor() {
        this.gameData = null;
        this.currentScene = null;
        this.gameState = {
            currentSceneId: 'start',
            variables: {},
            visitedScenes: new Set()
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadGameData();
            this.setupEventListeners();
            this.startGame();
        } catch (error) {
            console.error('ゲーム初期化エラー:', error);
            this.showError('ゲームデータの読み込みに失敗しました');
        }
    }
    
    async loadGameData() {
        const response = await fetch('data/game.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        this.gameData = await response.json();
    }
    
    setupEventListeners() {
        document.getElementById('save-btn').addEventListener('click', () => this.saveGame());
        document.getElementById('load-btn').addEventListener('click', () => this.loadGame());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
    }
    
    startGame() {
        this.loadScene(this.gameState.currentSceneId);
    }
    
    loadScene(sceneId) {
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
    }
    
    displayScene() {
        const storyText = document.getElementById('story-text');
        const choicesContainer = document.getElementById('choices-container');
        
        // ストーリーテキストを表示
        storyText.innerHTML = this.processText(this.currentScene.text);
        
        // 選択肢をクリア
        choicesContainer.innerHTML = '';
        
        // 選択肢を表示
        if (this.currentScene.choices) {
            this.currentScene.choices.forEach((choice, index) => {
                if (this.checkCondition(choice.condition)) {
                    const choiceBtn = document.createElement('button');
                    choiceBtn.className = 'choice-btn';
                    choiceBtn.textContent = choice.text;
                    choiceBtn.addEventListener('click', () => this.selectChoice(choice));
                    choicesContainer.appendChild(choiceBtn);
                }
            });
        }
    }
    
    processText(text) {
        // 変数置換などのテキスト処理
        return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return this.gameState.variables[varName] || match;
        });
    }
    
    checkCondition(condition) {
        if (!condition) return true;
        
        // 簡単な条件チェック (例: variable_name:value)
        const [varName, expectedValue] = condition.split(':');
        return this.gameState.variables[varName] == expectedValue;
    }
    
    selectChoice(choice) {
        // アクションを実行
        if (choice.actions) {
            choice.actions.forEach(action => this.executeAction(action));
        }
        
        // 次のシーンに移動
        if (choice.nextScene) {
            this.loadScene(choice.nextScene);
        }
    }
    
    executeAction(action) {
        const [actionType, ...params] = action.split(':');
        
        switch (actionType) {
            case 'set':
                const [varName, value] = params;
                this.gameState.variables[varName] = value;
                break;
            case 'add':
                const [addVar, addValue] = params;
                this.gameState.variables[addVar] = (this.gameState.variables[addVar] || 0) + parseInt(addValue);
                break;
            default:
                console.warn(`未知のアクション: ${actionType}`);
        }
    }
    
    updateStatusBar() {
        document.getElementById('current-scene').textContent = `シーン: ${this.gameState.currentSceneId}`;
    }
    
    saveGame() {
        try {
            const saveData = {
                gameState: {
                    ...this.gameState,
                    visitedScenes: Array.from(this.gameState.visitedScenes)
                },
                timestamp: Date.now()
            };
            
            localStorage.setItem('mistvoyage_save', JSON.stringify(saveData));
            this.showSaveStatus('セーブしました');
        } catch (error) {
            console.error('セーブエラー:', error);
            this.showSaveStatus('セーブに失敗しました', true);
        }
    }
    
    loadGame() {
        try {
            const saveData = localStorage.getItem('mistvoyage_save');
            if (!saveData) {
                this.showSaveStatus('セーブデータがありません', true);
                return;
            }
            
            const parsed = JSON.parse(saveData);
            this.gameState = {
                ...parsed.gameState,
                visitedScenes: new Set(parsed.gameState.visitedScenes)
            };
            
            this.loadScene(this.gameState.currentSceneId);
            this.showSaveStatus('ロードしました');
        } catch (error) {
            console.error('ロードエラー:', error);
            this.showSaveStatus('ロードに失敗しました', true);
        }
    }
    
    showSaveStatus(message, isError = false) {
        const statusElement = document.getElementById('save-status');
        statusElement.textContent = message;
        statusElement.style.color = isError ? '#ff6666' : '#66ccff';
        
        setTimeout(() => {
            statusElement.textContent = '';
        }, 3000);
    }
    
    showSettings() {
        alert('設定画面（未実装）');
    }
    
    showError(message) {
        document.getElementById('story-text').innerHTML = `<p style="color: #ff6666;">エラー: ${message}</p>`;
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new MistvoyageGame();
});