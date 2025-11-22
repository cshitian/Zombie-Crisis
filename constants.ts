
import { WeaponType } from './types';

export const GAME_CONSTANTS = {
  // Base Speeds (degrees per tick) - Significantly reduced for realism
  // 1 degree approx 111km. 0.000005 deg is approx 0.5 meters. 
  // At 20 ticks/sec, that's 10m/s (sprint speed). 
  MAX_SPEED_ZOMBIE: 0.000007,    // Slightly faster than civilians
  MAX_SPEED_SOLDIER: 0.000008,   // Fastest, tactical gear
  MAX_SPEED_CIVILIAN: 0.000005,  // Normal human running speed
  
  // Speed Multipliers
  MULT_SPRINT: 1.2, // When fleeing/chasing
  MULT_WANDER: 0.6, // When idle/patrolling

  // Ranges (degrees)
  INFECTION_RANGE: 0.00015, // Melee range
  VISION_RANGE_ZOMBIE: 0.0025,  // Reduced vision to match slower speeds
  VISION_RANGE_HUMAN: 0.0030,
  
  // Steering Forces (Weights)
  FORCE_SEPARATION: 3.0, // Strong separation to avoid stacking
  FORCE_SEEK: 1.5,       // Chase target
  FORCE_FLEE: 4.0,       // Run away priority is high
  FORCE_WANDER: 0.8,     // Constant movement when idle
  FORCE_COHESION: 0.2,   // Group up (civilians)
  
  // Physics
  SEPARATION_RADIUS: 0.00015, // Personal space
  
  // Area of Effect for Abilities
  AIRSTRIKE_RADIUS: 0.0012,
  SUPPLY_RADIUS: 0.0015,
  
  // Game Logic
  TICK_RATE: 50, // ms
  INITIAL_POPULATION: 120,
  SPAWN_RADIUS: 0.0025, // Spread of population
  
  // Costs
  COST_AIRSTRIKE: 50,
  COST_SPEC_OPS: 30,
  COST_SUPPLY: 20,
  INITIAL_RESOURCES: 100,
  PASSIVE_INCOME: 0.25
};

export const WEAPON_STATS = {
  [WeaponType.PISTOL]: {
    range: 0.0005,
    damage: 4,
    color: '#FBBF24', // Yellow
    name: 'M1911手枪',
    description: '近距离自卫武器'
  },
  [WeaponType.SHOTGUN]: {
    range: 0.0004,
    damage: 15,
    color: '#F97316', // Orange
    name: '雷明顿霰弹枪',
    description: '近战高伤害面杀伤'
  },
  [WeaponType.SNIPER]: {
    range: 0.0012, // Very Long
    damage: 20, // One shot kill usually
    color: '#FFFFFF', // White trace
    name: 'AWM狙击步枪',
    description: '超远距离精准打击'
  },
  [WeaponType.ROCKET]: {
    range: 0.0008,
    damage: 25,
    splashRadius: 0.0004,
    color: '#EF4444', // Red
    name: 'AT4火箭筒',
    description: '范围爆炸伤害'
  }
};

export const DEFAULT_LOCATION = {
  lat: 40.7580,
  lng: -73.9855
};

export const CHINESE_SURNAMES = [
  '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'
];

export const CHINESE_GIVEN_NAMES_MALE = [
  '伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '明', '刚',
  '平', '辉', '鹏', '华', '飞', '鑫', '波', '斌', '宇', '浩'
];

export const CHINESE_GIVEN_NAMES_FEMALE = [
  '芳', '娜', '敏', '静', '秀', '娟', '英', '华', '慧', '巧',
  '美', '兰', '霞', '玲', '燕', '萍', '雪', '琳', '洁', '梅'
];

export const THOUGHTS = {
  CIVILIAN_CALM: [
    "今天天气真不错", "晚饭吃什么呢？", "最近工作压力好大", "想喝杯奶茶", 
    "刚才那个人好眼熟", "手机快没电了", "想回家睡觉", "这个周末去哪玩？",
    "听说最近流感很严重", "快递怎么还没到"
  ],
  CIVILIAN_PANIC: [
    "救命啊！", "那是什么鬼东西？！", "别过来！", "我要回家！", 
    "警察在哪里？！", "我的腿在发抖...", "快跑！快跑！", "难道是电影里的丧尸？",
    "谁来救救我！", "我不想死..."
  ],
  CIVILIAN_ARMED: [
    "离我远点！", "我会开枪的！", "保护大家！", "跟它们拼了！", 
    "这枪怎么这么沉", "别怕，跟紧我", "瞄准头！", "为了生存！"
  ],
  ZOMBIE: [
    "饿...", "肉...", "血...", "吃...", 
    "好香...", "痛...", "吼...", "..."
  ],
  SOLDIER: [
    "保持队形！", "目标已锁定", "开火！", "清理区域", 
    "注意侧翼", "弹药充足", "为了人类", "不要让它们靠近",
    "确认击毙", "呼叫支援"
  ]
};
