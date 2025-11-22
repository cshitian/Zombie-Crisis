
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, EntityType, CivilianType, GameEntity, GameState, RadioMessage, ToolType, Vector, WeaponType, VisualEffect } from '../types';
import { GAME_CONSTANTS, DEFAULT_LOCATION, CHINESE_SURNAMES, CHINESE_GIVEN_NAMES_MALE, CHINESE_GIVEN_NAMES_FEMALE, THOUGHTS, WEAPON_STATS } from '../constants';
import { generateRadioChatter } from '../services/geminiService';

// --- Vector Math Helpers ---
const getVecDistance = (p1: Coordinates, p2: Coordinates) => {
  return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
};

const normalize = (v: Vector): Vector => {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
};

const addVec = (v1: Vector, v2: Vector): Vector => ({ x: v1.x + v2.x, y: v1.y + v2.y });
const subVec = (v1: Vector, v2: Vector): Vector => ({ x: v1.x - v2.x, y: v1.y - v2.y });
const multVec = (v: Vector, s: number): Vector => ({ x: v.x * s, y: v.y * s });
const limitVec = (v: Vector, max: number): Vector => {
  const magSq = v.x * v.x + v.y * v.y;
  if (magSq > max * max) {
    const n = normalize(v);
    return multVec(n, max);
  }
  return v;
};

// --- Helpers ---
const getRandomName = (isMale: boolean) => {
  const surname = CHINESE_SURNAMES[Math.floor(Math.random() * CHINESE_SURNAMES.length)];
  const givenNames = isMale ? CHINESE_GIVEN_NAMES_MALE : CHINESE_GIVEN_NAMES_FEMALE;
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  return surname + givenName;
};

const getRandomWeapon = (): WeaponType => {
  const rand = Math.random();
  if (rand < 0.4) return WeaponType.PISTOL;
  if (rand < 0.7) return WeaponType.SHOTGUN;
  if (rand < 0.9) return WeaponType.SNIPER;
  return WeaponType.ROCKET;
};

const getRandomThought = (entity: GameEntity, neighbors: GameEntity[], nearbyZombies: number) => {
  let pool: string[] = [];
  
  if (entity.type === EntityType.ZOMBIE) {
    pool = THOUGHTS.ZOMBIE;
  } else if (entity.type === EntityType.SOLDIER) {
    pool = THOUGHTS.SOLDIER;
  } else {
    // Civilian
    if (entity.isArmed) {
      pool = THOUGHTS.CIVILIAN_ARMED;
    } else if (nearbyZombies > 0) {
      pool = THOUGHTS.CIVILIAN_PANIC;
    } else {
      pool = THOUGHTS.CIVILIAN_CALM;
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

const createEntityIcon = (entity: GameEntity, isSelected: boolean) => {
  let colorClass = 'bg-blue-500'; 
  let shapeClass = '';
  let size = isSelected ? 'w-5 h-5' : 'w-3 h-3';
  let effectClass = '';
  let ringClass = isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : '';

  if (entity.type === EntityType.ZOMBIE) {
    colorClass = 'bg-red-600';
    effectClass = 'shadow-[0_0_8px_rgba(220,38,38,0.8)]';
  } else if (entity.type === EntityType.SOLDIER) {
    colorClass = 'bg-blue-500 border border-white';
    effectClass = 'shadow-[0_0_5px_rgba(59,130,246,0.8)]';
  } else if (entity.isArmed) {
    colorClass = 'bg-yellow-400'; 
  }

  // Shapes based on type/demographic
  if (entity.type === EntityType.CIVILIAN) {
    switch (entity.subType) {
      case CivilianType.MAN: shapeClass = 'rounded-sm'; break; 
      case CivilianType.WOMAN: shapeClass = 'rounded-full'; break; 
      case CivilianType.CHILD: shapeClass = 'rounded-full scale-75'; break; 
      case CivilianType.ELDERLY: shapeClass = 'rotate-45 rounded-sm'; break; 
    }
  } else {
    shapeClass = 'rounded-full'; 
  }

  return L.divIcon({
    className: 'bg-transparent',
    html: `<div class="${colorClass} ${shapeClass} ${size} ${effectClass} ${ringClass} transition-all duration-300"></div>`,
    iconSize: isSelected ? [20, 20] : [12, 12],
    iconAnchor: isSelected ? [10, 10] : [6, 6],
  });
};

// --- OPTIMIZED MARKER COMPONENT ---
// Updated to accept lat/lng as primitives to ensure React.memo detects position changes
const EntityMarker = React.memo(({ entity, lat, lng, isSelected, onSelect }: { entity: GameEntity, lat: number, lng: number, isSelected: boolean, onSelect: (id: string) => void }) => {
  
  // Memoize event handlers
  const eventHandlers = useMemo(() => ({
    click: (ev: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(ev);
      onSelect(entity.id);
    }
  }), [entity.id, onSelect]);

  // Memoize icon creation. Only update when visual state changes.
  const icon = useMemo(() => 
    createEntityIcon(entity, isSelected), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entity.type, entity.subType, entity.isArmed, entity.isInfected, isSelected]
  );

  return (
    <Marker 
      position={[lat, lng]} 
      icon={icon}
      eventHandlers={eventHandlers}
    />
  );
});

interface GameMapProps {
  selectedTool: ToolType;
  isPaused: boolean;
  onUpdateState: (state: GameState) => void;
  onAddLog: (msg: RadioMessage) => void;
  initialState: GameState;
  selectedEntityId: string | null;
  onEntitySelect: (id: string | null) => void;
}

const MapEvents: React.FC<{ onMapClick: (latlng: L.LatLng) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) { onMapClick(e.latlng); },
  });
  return null;
};

const GameMap: React.FC<GameMapProps> = ({ selectedTool, isPaused, onUpdateState, onAddLog, initialState, selectedEntityId, onEntitySelect }) => {
  const [centerPos, setCenterPos] = useState<Coordinates>(DEFAULT_LOCATION);
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [effects, setEffects] = useState<VisualEffect[]>([]); // Visual tracers/explosions
  const [initialized, setInitialized] = useState(false);
  
  // We use Refs for simulation state
  const entitiesRef = useRef<GameEntity[]>([]);
  const stateRef = useRef<GameState>(initialState);
  const pausedRef = useRef(isPaused);
  const selectedIdRef = useRef(selectedEntityId);

  // Sync refs with props
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { selectedIdRef.current = selectedEntityId; }, [selectedEntityId]);
  
  // Initialize Population
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const startPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenterPos(startPos);
        initPopulation(startPos);
        setInitialized(true);
        generateRadioChatter(stateRef.current, startPos, 'START').then(text => {
          onAddLog({ id: Date.now().toString(), sender: '指挥部', text, timestamp: Date.now() });
        });
      },
      (err) => {
        console.warn("Geolocation failed", err);
        initPopulation(DEFAULT_LOCATION);
        setInitialized(true);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initPopulation = (center: Coordinates) => {
    const newEntities: GameEntity[] = [];
    
    for (let i = 0; i < GAME_CONSTANTS.INITIAL_POPULATION; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * GAME_CONSTANTS.SPAWN_RADIUS;
      
      const types = [CivilianType.MAN, CivilianType.WOMAN, CivilianType.CHILD, CivilianType.ELDERLY];
      const subType = types[Math.floor(Math.random() * types.length)];
      const isMale = subType === CivilianType.MAN || subType === CivilianType.ELDERLY || (subType === CivilianType.CHILD && Math.random() > 0.5);
      
      const entity: GameEntity = {
        id: `civ-${i}`,
        type: EntityType.CIVILIAN,
        subType,
        name: getRandomName(isMale),
        age: subType === CivilianType.CHILD ? 5 + Math.floor(Math.random()*10) : subType === CivilianType.ELDERLY ? 60 + Math.floor(Math.random()*30) : 18 + Math.floor(Math.random()*40),
        gender: isMale ? '男' : '女',
        thought: '', // Init below
        position: {
          lat: center.lat + r * Math.cos(angle),
          lng: center.lng + r * Math.sin(angle) * 0.8 
        },
        velocity: { x: 0, y: 0 },
        wanderAngle: Math.random() * Math.PI * 2,
        isInfected: false,
        isArmed: false,
        health: 10
      };
      entity.thought = getRandomThought(entity, [], 0);
      newEntities.push(entity);
    }

    // Patient Zero
    for(let i = 0; i < 3; i++) {
        const targetIdx = Math.floor(Math.random() * newEntities.length);
        const z = newEntities[targetIdx];
        z.type = EntityType.ZOMBIE;
        z.isInfected = true;
        z.health = 20; 
        z.thought = THOUGHTS.ZOMBIE[0];
    }

    entitiesRef.current = newEntities;
    setEntities(newEntities);
  };

  // --- AI STEERING LOGIC HELPERS ---
  const getSeparationForce = (entity: GameEntity, neighbors: GameEntity[]): Vector => {
    let steering: Vector = { x: 0, y: 0 };
    let count = 0;
    for (const other of neighbors) {
      const d = getVecDistance(entity.position, other.position);
      if (d > 0 && d < GAME_CONSTANTS.SEPARATION_RADIUS) {
        const diff = subVec({x: entity.position.lat, y: entity.position.lng}, {x: other.position.lat, y: other.position.lng});
        steering = addVec(steering, multVec(normalize(diff), 1/d));
        count++;
      }
    }
    if (count > 0) steering = multVec(normalize(steering), GAME_CONSTANTS.FORCE_SEPARATION);
    return steering;
  };

  const getSeekForce = (entity: GameEntity, target: Coordinates): Vector => {
    const desired = subVec({x: target.lat, y: target.lng}, {x: entity.position.lat, y: entity.position.lng});
    return multVec(normalize(desired), GAME_CONSTANTS.FORCE_SEEK);
  };

  const getFleeForce = (entity: GameEntity, threat: Coordinates): Vector => {
    const desired = subVec({x: entity.position.lat, y: entity.position.lng}, {x: threat.lat, y: threat.lng}); 
    return multVec(normalize(desired), GAME_CONSTANTS.FORCE_FLEE);
  };

  const getWanderForce = (entity: GameEntity): Vector => {
    entity.wanderAngle += (Math.random() - 0.5) * 0.5;
    return multVec({x: Math.cos(entity.wanderAngle), y: Math.sin(entity.wanderAngle)}, GAME_CONSTANTS.FORCE_WANDER);
  };

  // --- MAIN LOOP ---
  useEffect(() => {
    if (!initialized || stateRef.current.gameResult) return;

    const intervalId = setInterval(() => {
      // --- 1. SIMULATION (Only run if playing) ---
      if (!pausedRef.current) {
        stateRef.current.resources += GAME_CONSTANTS.PASSIVE_INCOME;

        const allEntities = entitiesRef.current;
        const zombies = allEntities.filter(e => e.type === EntityType.ZOMBIE);
        const humans = allEntities.filter(e => e.type !== EntityType.ZOMBIE);
        const newEffects: VisualEffect[] = [];
        const deadIds = new Set<string>();
        
        // 1.1 CALCULATE FORCES & MOVEMENT
        allEntities.forEach(entity => {
          let acceleration: Vector = { x: 0, y: 0 };
          let maxSpeed = GAME_CONSTANTS.MAX_SPEED_CIVILIAN;
          let nearbyThreats = 0;

          // Separation & Wander
          acceleration = addVec(acceleration, getSeparationForce(entity, allEntities));
          const wanderForce = getWanderForce(entity);

          if (entity.type === EntityType.ZOMBIE) {
            maxSpeed = GAME_CONSTANTS.MAX_SPEED_ZOMBIE;
            let nearestHuman: GameEntity | null = null;
            let minDist = GAME_CONSTANTS.VISION_RANGE_ZOMBIE;
            
            humans.forEach(h => {
              const d = getVecDistance(entity.position, h.position);
              if (d < minDist) { minDist = d; nearestHuman = h; }
            });

            if (nearestHuman) {
              acceleration = addVec(acceleration, getSeekForce(entity, nearestHuman.position));
              maxSpeed *= GAME_CONSTANTS.MULT_SPRINT;
            } else {
              acceleration = addVec(acceleration, wanderForce);
              maxSpeed *= GAME_CONSTANTS.MULT_WANDER;
            }
          } else if (entity.type === EntityType.SOLDIER) {
            maxSpeed = GAME_CONSTANTS.MAX_SPEED_SOLDIER;
            let nearestZombie: GameEntity | null = null;
            let minDist = GAME_CONSTANTS.VISION_RANGE_HUMAN * 2;
            
            zombies.forEach(z => {
              const d = getVecDistance(entity.position, z.position);
              if (d < minDist) { minDist = d; nearestZombie = z; }
            });

            if (nearestZombie) {
              nearbyThreats = 1;
              const distToZombie = minDist;
              const weaponRange = entity.weaponType ? WEAPON_STATS[entity.weaponType].range : WEAPON_STATS[WeaponType.PISTOL].range;
              const optimalRange = weaponRange * 0.8;
              
              if (distToZombie > optimalRange) acceleration = addVec(acceleration, getSeekForce(entity, nearestZombie.position));
              else if (distToZombie < optimalRange * 0.4) acceleration = addVec(acceleration, getFleeForce(entity, nearestZombie.position));
              else acceleration = addVec(acceleration, multVec(wanderForce, 0.5));
            } else {
              acceleration = addVec(acceleration, wanderForce);
            }
          } else {
            // CIVILIAN
            let nearestZombie: GameEntity | null = null;
            let minDist = GAME_CONSTANTS.VISION_RANGE_HUMAN;
            zombies.forEach(z => {
              const d = getVecDistance(entity.position, z.position);
              if (d < minDist) { minDist = d; nearestZombie = z; nearbyThreats++; }
            });

            if (nearestZombie) {
              const panicThreshold = entity.isArmed ? minDist * 0.5 : minDist;
              if (getVecDistance(entity.position, nearestZombie.position) < panicThreshold) {
                  acceleration = addVec(acceleration, getFleeForce(entity, nearestZombie.position));
                  maxSpeed *= GAME_CONSTANTS.MULT_SPRINT;
              } else if (entity.isArmed) {
                  acceleration = addVec(acceleration, multVec(getFleeForce(entity, nearestZombie.position), 0.2));
              }
            } else {
              acceleration = addVec(acceleration, wanderForce);
              const distFromCenter = getVecDistance(entity.position, centerPos);
              if (distFromCenter > GAME_CONSTANTS.SPAWN_RADIUS * 1.2) {
                acceleration = addVec(acceleration, multVec(getSeekForce(entity, centerPos), 0.5));
              }
            }
          }

          // Update Thought occasionally
          if (Math.random() < 0.02) { 
            entity.thought = getRandomThought(entity, [], nearbyThreats);
          }

          entity.velocity = addVec(entity.velocity, acceleration);
          entity.velocity = limitVec(entity.velocity, maxSpeed);
          entity.position.lat += entity.velocity.x;
          entity.position.lng += entity.velocity.y;
        });

        // 1.2 INTERACTION LOOP (Infection & Combat)
        zombies.forEach(z => {
          humans.forEach(h => {
            if (deadIds.has(h.id)) return;
            if (getVecDistance(z.position, h.position) < GAME_CONSTANTS.INFECTION_RANGE) {
              h.health -= (h.type === EntityType.SOLDIER ? 1 : 2);
              if (h.health <= 0) {
                  h.type = EntityType.ZOMBIE;
                  h.isInfected = true;
                  h.health = (h.type === EntityType.SOLDIER ? 50 : 20); 
                  h.thought = THOUGHTS.ZOMBIE[0];
                  h.isArmed = false; // Zombies drop weapons
              }
            }
          });
        });

        const shooters = humans.filter(h => h.isArmed || h.type === EntityType.SOLDIER);
        shooters.forEach(shooter => {
          const weaponType = shooter.weaponType || WeaponType.PISTOL;
          const stats = WEAPON_STATS[weaponType];
          const targets = zombies.filter(z => !deadIds.has(z.id) && getVecDistance(shooter.position, z.position) < stats.range);
          
          if (targets.length > 0) {
            // Fire rate check (simulated by random probability)
            const fireProb = shooter.type === EntityType.SOLDIER ? 0.2 : 0.1; 
            if (Math.random() < fireProb) {
              
              // Weapon Behaviors
              if (weaponType === WeaponType.ROCKET) {
                  // Area of Effect
                  const mainTarget = targets[Math.floor(Math.random() * targets.length)];
                  const explosionRadius = stats.splashRadius || 0.0005;
                  
                  // Visual
                  newEffects.push({
                    id: `ex-${Date.now()}-${Math.random()}`,
                    type: 'EXPLOSION',
                    p1: mainTarget.position,
                    color: stats.color,
                    radius: explosionRadius,
                    timestamp: Date.now()
                  });
                  newEffects.push({
                    id: `rocket-${Date.now()}-${Math.random()}`,
                    type: 'SHOT',
                    p1: shooter.position,
                    p2: mainTarget.position,
                    color: stats.color,
                    timestamp: Date.now()
                  });

                  // Damage all in radius
                  zombies.forEach(z => {
                    if (getVecDistance(z.position, mainTarget.position) <= explosionRadius) {
                      z.health -= stats.damage;
                      if (z.health <= 0) deadIds.add(z.id);
                    }
                  });

              } else if (weaponType === WeaponType.SHOTGUN) {
                  // Multi-target
                  const nearbyTargets = targets.slice(0, 3); // Hit up to 3
                  nearbyTargets.forEach(target => {
                    target.health -= stats.damage;
                    newEffects.push({
                      id: `shot-${Date.now()}-${Math.random()}`,
                      type: 'SHOT',
                      p1: shooter.position,
                      p2: target.position,
                      color: stats.color,
                      timestamp: Date.now()
                    });
                    if (target.health <= 0) deadIds.add(target.id);
                  });

              } else {
                // Single Target (Sniper / Pistol)
                const target = targets[Math.floor(Math.random() * targets.length)];
                target.health -= stats.damage;
                newEffects.push({
                    id: `shot-${Date.now()}-${Math.random()}`,
                    type: 'SHOT',
                    p1: shooter.position,
                    p2: target.position,
                    color: stats.color,
                    timestamp: Date.now()
                });
                if (target.health <= 0) deadIds.add(target.id);
              }
            }
          }
        });

        entitiesRef.current = allEntities.filter(e => !deadIds.has(e.id));
        setEntities([...entitiesRef.current]);
        
        // Clear old effects
        const now = Date.now();
        setEffects(prev => [...prev.filter(e => now - e.timestamp < 150), ...newEffects]);
      } // --- END SIMULATION BLOCK ---

      // --- 2. STATE SYNC (Run Always) ---
      const currentEntities = entitiesRef.current;
      stateRef.current.infectedCount = currentEntities.filter(e => e.type === EntityType.ZOMBIE).length;
      stateRef.current.soldierCount = currentEntities.filter(e => e.type === EntityType.SOLDIER).length;
      stateRef.current.healthyCount = currentEntities.length - stateRef.current.infectedCount - stateRef.current.soldierCount;

      // Sync selected entity state to UI (Critical for Inspector Panel while paused)
      stateRef.current.selectedEntity = selectedIdRef.current 
          ? currentEntities.find(e => e.id === selectedIdRef.current) || null
          : null;

      if (stateRef.current.infectedCount === 0 && stateRef.current.healthyCount > 0) stateRef.current.gameResult = 'VICTORY';
      else if (stateRef.current.healthyCount === 0 && stateRef.current.soldierCount === 0) stateRef.current.gameResult = 'DEFEAT';

      onUpdateState({...stateRef.current});

    }, GAME_CONSTANTS.TICK_RATE);

    return () => clearInterval(intervalId);
  }, [initialized, centerPos, onUpdateState]); 

  // --- PLAYER INPUT ---
  const handleMapClick = (latlng: L.LatLng) => {
    if (stateRef.current.gameResult || pausedRef.current) return;

    // Deselect if clicking on map (unless we clicked an entity, handled by bubble)
    onEntitySelect(null);

    const clickPos = { lat: latlng.lat, lng: latlng.lng };
    
    const useResource = (cost: number) => {
      if (stateRef.current.resources >= cost) {
        stateRef.current.resources -= cost;
        return true;
      }
      onAddLog({ id: Date.now().toString(), sender: '系统', text: '资金不足', timestamp: Date.now() });
      return false;
    };

    if (selectedTool === ToolType.AIRSTRIKE && useResource(GAME_CONSTANTS.COST_AIRSTRIKE)) {
        entitiesRef.current = entitiesRef.current.filter(e => {
          if (e.type === EntityType.ZOMBIE && getVecDistance(e.position, clickPos) < GAME_CONSTANTS.AIRSTRIKE_RADIUS) {
            return false;
          }
          return true;
        });
        onAddLog({ id: Date.now().toString(), sender: '飞行员', text: "目标区域已覆盖。打击完毕。", timestamp: Date.now() });
    } else if (selectedTool === ToolType.SUPPLY_DROP && useResource(GAME_CONSTANTS.COST_SUPPLY)) {
        const candidates = entitiesRef.current.filter(e => 
          e.type === EntityType.CIVILIAN && !e.isInfected && getVecDistance(e.position, clickPos) < GAME_CONSTANTS.SUPPLY_RADIUS
        );
        
        // Shuffle and pick max 4
        const luckySurvivors = candidates.sort(() => 0.5 - Math.random()).slice(0, 4);
        
        luckySurvivors.forEach(e => {
           e.isArmed = true;
           e.weaponType = getRandomWeapon();
           e.thought = `拿到了${WEAPON_STATS[e.weaponType].name}！跟它们拼了！`;
        });

        if (luckySurvivors.length > 0) {
            onAddLog({ id: Date.now().toString(), sender: '后勤', text: `补给已送达。${luckySurvivors.length} 名平民获得武装。`, timestamp: Date.now() });
        } else {
            onAddLog({ id: Date.now().toString(), sender: '系统', text: `投放位置无幸存者接收。`, timestamp: Date.now() });
        }

    } else if (selectedTool === ToolType.SPEC_OPS && useResource(GAME_CONSTANTS.COST_SPEC_OPS)) {
        for(let i=0; i<4; i++) {
           const wType = Math.random() > 0.5 ? WeaponType.ROCKET : WeaponType.SNIPER;
           entitiesRef.current.push({
             id: `soldier-${Date.now()}-${i}`,
             type: EntityType.SOLDIER,
             name: getRandomName(true),
             age: 20 + Math.floor(Math.random() * 10),
             gender: '男',
             thought: THOUGHTS.SOLDIER[0],
             position: { lat: clickPos.lat + (Math.random()*0.0001), lng: clickPos.lng + (Math.random()*0.0001) },
             velocity: { x: 0, y: 0 },
             wanderAngle: Math.random() * Math.PI * 2,
             isInfected: false,
             isArmed: true,
             weaponType: wType,
             health: 50
           });
        }
        onAddLog({ id: Date.now().toString(), sender: '总部', text: "特种小队已抵达战区。", timestamp: Date.now() });
    }
  };

  if (!initialized) return <div className="flex h-full w-full items-center justify-center bg-black text-green-500 font-mono text-xl animate-pulse">卫星数据载入中...</div>;

  return (
    <MapContainer 
      center={[centerPos.lat, centerPos.lng]} 
      zoom={18} 
      zoomControl={false}
      scrollWheelZoom={true}
      doubleClickZoom={false}
      className="h-full w-full z-0 bg-gray-900 cursor-crosshair"
    >
      <TileLayer
        attribution='&copy; OSM'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <MapEvents onMapClick={handleMapClick} />
      
      {effects.map(ef => {
        if (ef.type === 'SHOT' && ef.p2) {
            return (
              <Polyline 
                key={ef.id}
                positions={[[ef.p1.lat, ef.p1.lng], [ef.p2.lat, ef.p2.lng]]}
                pathOptions={{ color: ef.color, weight: ef.color === '#EF4444' ? 3 : 1, opacity: 0.8 }}
              />
            );
        } else if (ef.type === 'EXPLOSION' && ef.radius) {
            return (
               <Circle 
                 key={ef.id}
                 center={[ef.p1.lat, ef.p1.lng]}
                 radius={ef.radius * 100000} // Leaflet radius is meters, approx conv logic or just use hard pixel radius if needed, but circle needs meters. 1 deg lat ~ 111km. 0.0005deg ~ 50m
                 pathOptions={{ color: ef.color, fillColor: ef.color, fillOpacity: 0.5, stroke: false }}
               />
            );
        }
        return null;
      })}

      {entities.map(e => (
        <EntityMarker 
          key={e.id} 
          entity={e} 
          lat={e.position.lat}
          lng={e.position.lng}
          isSelected={e.id === selectedEntityId} 
          onSelect={onEntitySelect} 
        />
      ))}
    </MapContainer>
  );
};

export default GameMap;
