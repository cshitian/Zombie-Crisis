
export enum EntityType {
  CIVILIAN = 'CIVILIAN',
  ZOMBIE = 'ZOMBIE',
  SOLDIER = 'SOLDIER'
}

export enum CivilianType {
  MAN = 'MAN',
  WOMAN = 'WOMAN',
  CHILD = 'CHILD',
  ELDERLY = 'ELDERLY'
}

export enum ToolType {
  NONE = 'NONE',
  SUPPLY_DROP = 'SUPPLY_DROP', // Arms civilians
  SPEC_OPS = 'SPEC_OPS',       // Spawns soldiers
  AIRSTRIKE = 'AIRSTRIKE'      // Kills zombies in area
}

export enum WeaponType {
  PISTOL = 'PISTOL',
  SNIPER = 'SNIPER',
  SHOTGUN = 'SHOTGUN',
  ROCKET = 'ROCKET'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Vector {
  x: number; // Represents lat delta
  y: number; // Represents lng delta
}

export interface GameEntity {
  id: string;
  type: EntityType;
  subType?: CivilianType; // Only for civilians
  
  // Bio Data
  name: string;
  age: number;
  gender: string; // Display string (男/女)
  thought: string; // Inner monologue
  
  position: Coordinates;
  velocity: Vector; // Current movement vector
  wanderAngle: number; // For smooth wandering
  isInfected: boolean;
  isArmed: boolean; // If true, can kill zombies
  weaponType?: WeaponType; // Specific weapon
  health: number;
  targetId?: string; // For UI debugging or logic
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  healthyCount: number;
  infectedCount: number;
  soldierCount: number;
  gameResult: 'VICTORY' | 'DEFEAT' | null;
  resources: number; // "Budget" for using abilities
  selectedEntity: GameEntity | null; // The entity currently being inspected
}

export interface RadioMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

// Visual effect for a shot or explosion
export interface VisualEffect {
  id: string;
  type: 'SHOT' | 'EXPLOSION';
  p1: Coordinates;
  p2?: Coordinates; // Target position for shots
  color: string;
  radius?: number; // For explosions
  timestamp: number;
}
