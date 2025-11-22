
import React, { useState, useCallback } from 'react';
import GameMap from './components/GameMap';
import UIOverlay from './components/UIOverlay';
import { GameState, RadioMessage, ToolType } from './types';
import { GAME_CONSTANTS } from './constants';

const App: React.FC = () => {
  // gameId acts as a key to force component remounting for a full reset
  const [gameId, setGameId] = useState(0); 
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: true,
    isPaused: false,
    healthyCount: GAME_CONSTANTS.INITIAL_POPULATION,
    infectedCount: 2,
    soldierCount: 0,
    gameResult: null,
    resources: GAME_CONSTANTS.INITIAL_RESOURCES,
    selectedEntity: null,
  });

  const [radioLogs, setRadioLogs] = useState<RadioMessage[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolType>(ToolType.NONE);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Optimized state update handler to prevent re-renders from recreating functions
  const handleStateUpdate = useCallback((newState: GameState) => {
    setGameState(prev => ({
        ...prev,
        healthyCount: newState.healthyCount,
        infectedCount: newState.infectedCount,
        soldierCount: newState.soldierCount,
        gameResult: newState.gameResult,
        resources: newState.resources, // Sync resources from simulation
        selectedEntity: newState.selectedEntity // Sync inspection data from simulation
    }));
  }, []);

  const handleAddLog = useCallback((msg: RadioMessage) => {
    setRadioLogs(prev => [...prev.slice(-5), msg]);
  }, []);

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleResetGame = () => {
    setGameId(prev => prev + 1);
    setGameState({
      isPlaying: true,
      isPaused: false,
      healthyCount: GAME_CONSTANTS.INITIAL_POPULATION,
      infectedCount: 2,
      soldierCount: 0,
      gameResult: null,
      resources: GAME_CONSTANTS.INITIAL_RESOURCES,
      selectedEntity: null,
    });
    setRadioLogs([]);
    setSelectedTool(ToolType.NONE);
    setSelectedEntityId(null);
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <GameMap 
        key={gameId} // Key change forces complete remount and fresh initialization
        selectedTool={selectedTool}
        isPaused={gameState.isPaused}
        initialState={gameState}
        onUpdateState={handleStateUpdate}
        onAddLog={handleAddLog}
        selectedEntityId={selectedEntityId}
        onEntitySelect={setSelectedEntityId}
      />
      
      <UIOverlay 
        gameState={gameState}
        radioLogs={radioLogs}
        selectedTool={selectedTool}
        onSelectTool={setSelectedTool}
        onTogglePause={togglePause}
        onReset={handleResetGame}
      />
    </div>
  );
};

export default App;
