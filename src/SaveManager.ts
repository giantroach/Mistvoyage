import { GameState, SaveData } from './types.js';

export class SaveManager {
  saveGame(gameState: GameState): { success: boolean; message: string } {
    try {
      const saveData: SaveData = {
        gameState: {
          currentChapter: gameState.currentChapter,
          currentMap: gameState.currentMap,
          currentNodeId: gameState.currentNodeId,
          eventsCompleted: gameState.eventsCompleted,
          playerParameters: gameState.playerParameters,
          variables: gameState.variables,
          visitedNodes: Array.from(gameState.visitedNodes),
          activeSequentialEvents: gameState.activeSequentialEvents,
          gamePhase: gameState.gamePhase,
        },
        timestamp: Date.now(),
      };

      localStorage.setItem('mistvoyage_save', JSON.stringify(saveData));
      return { success: true, message: 'セーブしました' };
    } catch (error) {
      console.error('セーブエラー:', error);
      return { success: false, message: 'セーブに失敗しました' };
    }
  }

  loadGame(): { success: boolean; message: string; gameState?: GameState } {
    try {
      const saveData = localStorage.getItem('mistvoyage_save');
      if (!saveData) {
        return { success: false, message: 'セーブデータがありません' };
      }

      const parsed: SaveData = JSON.parse(saveData);
      const gameState: GameState = {
        currentChapter: parsed.gameState.currentChapter,
        currentMap: parsed.gameState.currentMap,
        currentNodeId: parsed.gameState.currentNodeId,
        eventsCompleted: parsed.gameState.eventsCompleted,
        playerParameters: parsed.gameState.playerParameters,
        variables: parsed.gameState.variables,
        visitedNodes: new Set(parsed.gameState.visitedNodes),
        activeSequentialEvents: parsed.gameState.activeSequentialEvents,
        gamePhase: parsed.gameState.gamePhase,
      };

      return { success: true, message: 'ロードしました', gameState };
    } catch (error) {
      console.error('ロードエラー:', error);
      return { success: false, message: 'ロードに失敗しました' };
    }
  }

  hasSaveData(): boolean {
    try {
      const saveData = localStorage.getItem('mistvoyage_save');
      return saveData !== null;
    } catch (error) {
      console.error('セーブデータ確認エラー:', error);
      return false;
    }
  }

  deleteSaveData(): { success: boolean; message: string } {
    try {
      localStorage.removeItem('mistvoyage_save');
      return { success: true, message: 'セーブデータを削除しました' };
    } catch (error) {
      console.error('セーブデータ削除エラー:', error);
      return { success: false, message: 'セーブデータの削除に失敗しました' };
    }
  }

  getSaveInfo(): {
    exists: boolean;
    timestamp?: number;
    formattedDate?: string;
  } {
    try {
      const saveData = localStorage.getItem('mistvoyage_save');
      if (!saveData) {
        return { exists: false };
      }

      const parsed: SaveData = JSON.parse(saveData);
      const date = new Date(parsed.timestamp);
      const formattedDate = date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        exists: true,
        timestamp: parsed.timestamp,
        formattedDate,
      };
    } catch (error) {
      console.error('セーブ情報取得エラー:', error);
      return { exists: false };
    }
  }
}
