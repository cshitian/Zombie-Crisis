
import React, { useEffect, useRef } from 'react';
import { GameState, RadioMessage, ToolType, EntityType, WeaponType } from '../types';
import { GAME_CONSTANTS, WEAPON_STATS } from '../constants';

interface UIOverlayProps {
  gameState: GameState;
  radioLogs: RadioMessage[];
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onTogglePause: () => void;
  onReset: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ gameState, radioLogs, selectedTool, onSelectTool, onTogglePause, onReset }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [radioLogs]);

  const totalPop = gameState.healthyCount + gameState.infectedCount + gameState.soldierCount;
  const pctHealthy = totalPop > 0 ? (gameState.healthyCount / totalPop) * 100 : 0;
  const pctSoldier = totalPop > 0 ? (gameState.soldierCount / totalPop) * 100 : 0;
  const pctInfected = totalPop > 0 ? (gameState.infectedCount / totalPop) * 100 : 0;

  const getWeaponInfo = (entity: any) => {
      if (!entity.isArmed) return null;
      const wType = entity.weaponType || WeaponType.PISTOL;
      return WEAPON_STATS[wType];
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-sans">
      
      {/* Top Bar: Simulation Stats */}
      <div className="absolute top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md p-4 flex flex-col gap-3 pointer-events-auto border-b border-slate-700 shadow-2xl z-20">
        <div className="flex justify-between items-center">
             <div className="flex items-center gap-4">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-widest italic drop-shadow-md">
                僵尸危机 <span className="text-red-500">行动代号Z</span>
                </h1>
                <button 
                    onClick={onTogglePause}
                    className={`
                        min-w-[120px] h-8 px-4 rounded font-bold text-xs uppercase tracking-wider border transition-all flex items-center justify-center whitespace-nowrap
                        ${gameState.isPaused 
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 animate-pulse' 
                            : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                        }
                    `}
                >
                    {gameState.isPaused ? "⏸ 模拟暂停" : "▶ 模拟进行中"}
                </button>
             </div>
             <div className="flex items-center gap-3 bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-600 shadow-inner">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">预算资金</span>
                <span className="text-yellow-400 font-mono font-bold text-xl">${Math.floor(gameState.resources)}</span>
             </div>
        </div>

        {/* Population Bar */}
        <div className="flex flex-col gap-1">
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex relative shadow-inner border border-slate-700/50">
                <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" style={{width: `${pctHealthy}%`}} />
                <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500" style={{width: `${pctSoldier}%`}} />
                <div className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] transition-all duration-500" style={{width: `${pctInfected}%`}} />
            </div>
            <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                <span className="text-emerald-400 drop-shadow-sm">幸存者: {gameState.healthyCount}</span>
                <span className="text-blue-400 drop-shadow-sm">作战部队: {gameState.soldierCount}</span>
                <span className="text-red-500 drop-shadow-sm">感染者: {gameState.infectedCount}</span>
            </div>
        </div>
      </div>

      {/* Entity Inspector (Top Right, below header) */}
      {gameState.selectedEntity && (
        <div className="absolute top-28 right-4 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-500/50 rounded-xl p-4 shadow-2xl z-30 pointer-events-auto transition-all duration-200 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-3">
                <h3 className="text-sm font-bold text-white tracking-wider uppercase">个体信息识别</h3>
                <div className={`w-3 h-3 rounded-full animate-pulse ${gameState.selectedEntity.type === EntityType.ZOMBIE ? 'bg-red-500' : gameState.selectedEntity.type === EntityType.SOLDIER ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <span className="text-2xl font-black text-white">{gameState.selectedEntity.name}</span>
                    <span className="text-xs text-slate-400 mb-1">{gameState.selectedEntity.gender} / {gameState.selectedEntity.age}岁</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {gameState.selectedEntity.type === EntityType.ZOMBIE ? '已感染 (ZOMBIE)' : gameState.selectedEntity.type === EntityType.SOLDIER ? '特种兵 (SPEC OPS)' : '平民 (CIVILIAN)'}
                    </span>
                </div>

                {gameState.selectedEntity.isArmed && getWeaponInfo(gameState.selectedEntity) && (
                    <div className="bg-slate-800/50 border border-slate-700 p-2 rounded flex items-center justify-between mt-1">
                        <div className="flex flex-col">
                             <span className="text-[10px] text-yellow-400 font-bold uppercase">{getWeaponInfo(gameState.selectedEntity).name}</span>
                             <span className="text-[8px] text-slate-400">{getWeaponInfo(gameState.selectedEntity).description}</span>
                        </div>
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: getWeaponInfo(gameState.selectedEntity).color}}></div>
                    </div>
                )}

                {/* Health Bar */}
                <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>生命值</span>
                        <span>{Math.max(0, gameState.selectedEntity.health)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${gameState.selectedEntity.health < 5 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(100, Math.max(0, gameState.selectedEntity.health * 5))}%`}}></div>
                    </div>
                </div>

                {/* Thoughts Bubble */}
                <div className="mt-4 relative bg-slate-800 p-3 rounded-lg rounded-tl-none border border-slate-700">
                    <div className="absolute -top-2 left-0 w-0 h-0 border-l-[10px] border-l-slate-800 border-t-[10px] border-t-transparent transform rotate-90"></div>
                    <p className="text-xs italic text-slate-300 leading-relaxed">
                        "{gameState.selectedEntity.thought}"
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* Middle: Victory/Defeat Modal */}
      {gameState.gameResult && (
         <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50 animate-fade-in">
            <div className={`border-4 p-8 rounded-2xl text-center max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-800 ${gameState.gameResult === 'VICTORY' ? 'border-emerald-500 shadow-emerald-900/20' : 'border-red-600 shadow-red-900/20'}`}>
                <h2 className={`text-6xl font-black mb-2 tracking-tighter ${gameState.gameResult === 'VICTORY' ? 'text-emerald-500' : 'text-red-600'}`}>
                    {gameState.gameResult === 'VICTORY' ? '行动成功' : '行动失败'}
                </h2>
                <div className="h-1 w-24 mx-auto bg-slate-600 mb-6 rounded-full"></div>
                <p className="text-slate-300 mb-8 text-lg font-medium leading-relaxed">
                    {gameState.gameResult === 'VICTORY' 
                        ? "该区域已被净化。文明得以存续。" 
                        : "防线崩溃。该区域已沦陷。"}
                </p>
                <button 
                  onClick={onReset}
                  className="bg-white hover:bg-slate-200 text-slate-900 font-black py-4 px-10 rounded-xl transition-all transform hover:scale-105 uppercase tracking-widest shadow-lg"
                >
                    重新部署
                </button>
            </div>
         </div>
      )}

      {/* Bottom Left: Radio Log */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto hidden lg:flex">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl w-96 h-56 overflow-hidden flex flex-col shadow-2xl">
              <h3 className="text-[10px] font-bold text-emerald-500 uppercase mb-3 tracking-widest flex items-center gap-2 border-b border-slate-700 pb-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                  实时通讯频道
              </h3>
              <div ref={scrollRef} className="overflow-y-auto flex-1 space-y-3 pr-2 text-xs font-mono leading-relaxed scrollbar-hide">
                  {radioLogs.length === 0 && <span className="text-slate-600 italic">正在建立连接...</span>}
                  {radioLogs.map(log => (
                      <div key={log.id} className="flex gap-2">
                          <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit'})}]</span> 
                          <div>
                              <span className={`font-bold mr-2 ${log.sender === '指挥部' ? 'text-yellow-500' : log.sender === '系统' ? 'text-red-400' : 'text-blue-400'}`}>
                                  {log.sender}:
                              </span>
                              <span className="text-slate-300">{log.text}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* Bottom Right: Toolbar */}
      <div className="absolute bottom-4 right-4 left-4 lg:left-auto z-20 pointer-events-auto overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 justify-center lg:justify-end min-w-max">
            <ToolButton 
                icon="🖐️" 
                line1="观察"
                line2="移动"
                cost={0} 
                isActive={selectedTool === ToolType.NONE} 
                onClick={() => onSelectTool(ToolType.NONE)} 
            />
            <ToolButton 
                icon="📦" 
                line1="空投"
                line2="武器"
                cost={GAME_CONSTANTS.COST_SUPPLY} 
                isActive={selectedTool === ToolType.SUPPLY_DROP} 
                onClick={() => onSelectTool(ToolType.SUPPLY_DROP)} 
            />
            <ToolButton 
                icon="🚁" 
                line1="特种" 
                line2="突击队"
                cost={GAME_CONSTANTS.COST_SPEC_OPS} 
                isActive={selectedTool === ToolType.SPEC_OPS} 
                onClick={() => onSelectTool(ToolType.SPEC_OPS)} 
            />
            <ToolButton 
                icon="✈️" 
                line1="精确"
                line2="空袭"
                cost={GAME_CONSTANTS.COST_AIRSTRIKE} 
                isActive={selectedTool === ToolType.AIRSTRIKE} 
                onClick={() => onSelectTool(ToolType.AIRSTRIKE)} 
            />
        </div>
      </div>
    </div>
  );
};

const ToolButton: React.FC<{
    icon: string, 
    line1: string, 
    line2: string,
    cost: number, 
    isActive: boolean, 
    onClick: () => void
}> = ({icon, line1, line2, cost, isActive, onClick}) => (
    <button 
        onClick={onClick}
        className={`
            group relative flex flex-col items-center justify-center 
            w-24 h-24 sm:w-32 sm:h-32 rounded-2xl transition-all duration-200 
            border-2 shadow-xl shrink-0 overflow-hidden
            ${isActive 
                ? 'bg-slate-800 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105 z-10' 
                : 'bg-slate-800/80 border-slate-600 hover:bg-slate-700 hover:border-slate-500 hover:-translate-y-1'
            }
        `}
    >
        {cost > 0 && (
            <div className={`
                absolute top-2 right-2 
                px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight
                ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-yellow-400'}
            `}>
                ${cost}
            </div>
        )}

        <div className="text-3xl sm:text-5xl mb-1 sm:mb-2 filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        
        <div className="flex flex-col items-center leading-none">
            <span className={`text-[10px] sm:text-xs font-black tracking-widest uppercase ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {line1}
            </span>
            <span className={`text-[10px] sm:text-xs font-black tracking-widest uppercase mt-0.5 ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {line2}
            </span>
        </div>

        {isActive && (
            <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-400 ring-inset animate-pulse pointer-events-none"></div>
        )}
    </button>
);

export default UIOverlay;
