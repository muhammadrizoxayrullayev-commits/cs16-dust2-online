// Counter-Strike 1.6 Economy & Buy Menu Specification

export const CS_WEAPONS = {
  // Knives
  knife: {
    id: 'knife',
    name: 'Tactical Knife',
    category: 'knife',
    slot: 3,
    price: 0,
    team: 'BOTH',
    damage: 40,
    headshotMultiplier: 2.5,
    fireRate: 0.4, // seconds between attacks
    range: 3.5,
    killReward: 1500
  },

  // Pistols (Slot 2)
  glock: {
    id: 'glock',
    name: 'Glock-18',
    category: 'pistols',
    slot: 2,
    price: 400,
    team: 'T',
    damage: 28,
    headshotMultiplier: 3.2,
    fireRate: 0.16,
    clipSize: 20,
    maxReserve: 120,
    reloadTime: 2.2,
    spread: 0.012,
    recoil: 0.018,
    killReward: 300
  },
  usp: {
    id: 'usp',
    name: 'USP .45 Tactical',
    category: 'pistols',
    slot: 2,
    price: 500,
    team: 'CT',
    damage: 34,
    headshotMultiplier: 3.6,
    fireRate: 0.18,
    clipSize: 12,
    maxReserve: 100,
    reloadTime: 2.2,
    spread: 0.008,
    recoil: 0.02,
    killReward: 300
  },
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle (.50 AE)',
    category: 'pistols',
    slot: 2,
    price: 650,
    team: 'BOTH',
    damage: 54,
    headshotMultiplier: 4.0,
    fireRate: 0.25,
    clipSize: 7,
    maxReserve: 35,
    reloadTime: 2.3,
    spread: 0.015,
    recoil: 0.045,
    killReward: 300
  },

  // Shotguns (Slot 1)
  m3: {
    id: 'm3',
    name: 'M3 Super 90',
    category: 'shotguns',
    slot: 1,
    price: 1700,
    team: 'BOTH',
    damage: 22, // per pellet (8 pellets)
    pellets: 8,
    headshotMultiplier: 2.0,
    fireRate: 0.9,
    clipSize: 8,
    maxReserve: 32,
    reloadTime: 3.0,
    spread: 0.045,
    recoil: 0.06,
    killReward: 300
  },

  // SMGs (Slot 1)
  mp5: {
    id: 'mp5',
    name: 'MP5 Navy',
    category: 'smgs',
    slot: 1,
    price: 1500,
    team: 'BOTH',
    damage: 26,
    headshotMultiplier: 3.0,
    fireRate: 0.085, // fast fire rate
    clipSize: 30,
    maxReserve: 120,
    reloadTime: 2.6,
    spread: 0.014,
    recoil: 0.015,
    killReward: 300
  },
  p90: {
    id: 'p90',
    name: 'ES P90',
    category: 'smgs',
    slot: 1,
    price: 2350,
    team: 'BOTH',
    damage: 21,
    headshotMultiplier: 2.8,
    fireRate: 0.066,
    clipSize: 50,
    maxReserve: 100,
    reloadTime: 3.3,
    spread: 0.018,
    recoil: 0.012,
    killReward: 300
  },

  // Rifles (Slot 1)
  ak47: {
    id: 'ak47',
    name: 'CV-47 (AK-47)',
    category: 'rifles',
    slot: 1,
    price: 2500,
    team: 'T',
    damage: 36,
    headshotMultiplier: 4.0, // 1 shot kill headshot!
    fireRate: 0.1,
    clipSize: 30,
    maxReserve: 90,
    reloadTime: 2.5,
    spread: 0.009,
    recoil: 0.035,
    killReward: 300
  },
  m4a1: {
    id: 'm4a1',
    name: 'Maverick M4A1 Carbine',
    category: 'rifles',
    slot: 1,
    price: 3100,
    team: 'CT',
    damage: 33,
    headshotMultiplier: 3.8,
    fireRate: 0.09,
    clipSize: 30,
    maxReserve: 90,
    reloadTime: 2.8,
    spread: 0.007,
    recoil: 0.024,
    killReward: 300
  },
  awp: {
    id: 'awp',
    name: 'Magnum Sniper Rifle (AWP)',
    category: 'rifles',
    slot: 1,
    price: 4750,
    team: 'BOTH',
    damage: 115, // 1-shot body/head kill!
    headshotMultiplier: 4.0,
    fireRate: 1.4,
    clipSize: 10,
    maxReserve: 30,
    reloadTime: 3.6,
    spread: 0.001, // pinpoint when scoped & still
    recoil: 0.12,
    isSniper: true,
    killReward: 300
  },

  // Equipment (Slot 4 / 5)
  kevlar: {
    id: 'kevlar',
    name: 'Kevlar Vest',
    category: 'equipment',
    price: 650,
    team: 'BOTH'
  },
  helmet: {
    id: 'helmet',
    name: 'Kevlar + Helmet',
    category: 'equipment',
    price: 1000,
    team: 'BOTH'
  },
  flashbang: {
    id: 'flashbang',
    name: 'Flashbang Grenade',
    category: 'equipment',
    slot: 4,
    price: 200,
    team: 'BOTH'
  },
  hegrenade: {
    id: 'hegrenade',
    name: 'HE Grenade',
    category: 'equipment',
    slot: 4,
    price: 300,
    team: 'BOTH',
    damage: 75
  },
  defuser: {
    id: 'defuser',
    name: 'Defuse Kit',
    category: 'equipment',
    price: 200,
    team: 'CT'
  },
  c4: {
    id: 'c4',
    name: 'C4 Explosive',
    category: 'equipment',
    slot: 5,
    price: 0,
    team: 'T'
  }
};

export class EconomyManager {
  constructor(initialMoney = 800) {
    this.money = initialMoney;
    this.consecutiveLosses = 0;
  }

  canAfford(itemId) {
    const item = CS_WEAPONS[itemId];
    if (!item) return false;
    return this.money >= item.price;
  }

  buy(itemId, currentTeam) {
    const item = CS_WEAPONS[itemId];
    if (!item) return { success: false, reason: 'Unknown item' };

    // Check team restriction
    if (item.team !== 'BOTH' && item.team !== currentTeam) {
      return { success: false, reason: 'Restricted to ' + item.team };
    }

    if (this.money < item.price) {
      return { success: false, reason: 'Insufficient funds! ($' + item.price + ' needed)' };
    }

    this.money -= item.price;
    return {
      success: true,
      item: item,
      remainingMoney: this.money
    };
  }

  addMoney(amount) {
    this.money = Math.max(0, Math.min(16000, this.money + amount));
    return this.money;
  }

  // Exact CS 1.6 Round End Bonus Calculation
  onRoundEnd(won, isBombWin = false, hadBombPlanted = false) {
    let reward = 0;
    if (won) {
      this.consecutiveLosses = 0;
      reward = isBombWin ? 3500 : 3250;
    } else {
      this.consecutiveLosses = Math.min(4, this.consecutiveLosses + 1);
      // Loss base $1400, +$500 per consecutive loss round up to $3400
      reward = 1400 + this.consecutiveLosses * 500;
      // Extra $800 bonus if Terrorists planted bomb but lost
      if (hadBombPlanted) {
        reward += 800;
      }
    }
    return this.addMoney(reward);
  }
}
