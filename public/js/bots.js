import * as THREE from '../vendor/three.module.js';
import { CharacterModel } from './characters.js';
import { soundEngine } from './audio.js';

// Waypoints on Dust 2
export const DUST2_WAYPOINTS = {
  t_spawn: new THREE.Vector3(-50, 1.5, 90),
  outside_long: new THREE.Vector3(40, 1.5, 80),
  long_doors: new THREE.Vector3(45, 1.5, 60),
  long_a: new THREE.Vector3(55, 1.5, 20),
  site_a: new THREE.Vector3(40, 3, -35),
  catwalk: new THREE.Vector3(15, 3, -20),
  mid_doors: new THREE.Vector3(0, 1.5, 0),
  suicide: new THREE.Vector3(-10, 1.5, 50),
  upper_tunnels: new THREE.Vector3(-55, 1.5, 50),
  site_b: new THREE.Vector3(-60, 2, -50),
  b_doors: new THREE.Vector3(-40, 1.5, -70),
  ct_spawn: new THREE.Vector3(30, 1.5, -85)
};

// Simple routes
const ROUTES = {
  T_TO_A_LONG: ['t_spawn', 'outside_long', 'long_doors', 'long_a', 'site_a'],
  T_TO_A_SHORT: ['t_spawn', 'suicide', 'mid_doors', 'catwalk', 'site_a'],
  T_TO_B_TUNNELS: ['t_spawn', 'upper_tunnels', 'site_b'],
  CT_DEFEND_A: ['ct_spawn', 'site_a'],
  CT_DEFEND_B: ['ct_spawn', 'b_doors', 'site_b'],
  CT_MID_PATROL: ['ct_spawn', 'mid_doors', 'catwalk']
};

const CS_BOT_NAMES = [
  'Yuriy', 'Alex', 'Spetsnaz', 'Viper', 'Razor', 'Wolf',
  'Boris', 'Rex', 'Titan', 'Ghost', 'Hawk', 'Falcon',
  'Cobra', 'Hammer', 'Phantom', 'Grizzly'
];

export class Bot {
  constructor(id, name, team, scene) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.scene = scene;

    this.health = 100;
    this.isAlive = true;
    this.speed = 7.5;
    this.hasC4 = false;

    // 3D Model
    this.character = new CharacterModel(team, team === 'T' ? 'phoenix' : 'urban');
    this.character.setName(`[BOT] ${name}`);
    this.scene.add(this.character.group);

    // AI state
    this.state = 'patrol'; // patrol, combat, plant, defuse
    this.route = [];
    this.currentWaypointIdx = 0;
    this.target = null;
    this.lastFireTime = 0;

    this.respawn();
  }

  respawn() {
    this.health = 100;
    this.isAlive = true;
    this.state = 'patrol';
    this.character.updateAnimation(0, false, false, false);

    // Pick spawn & route
    if (this.team === 'T') {
      this.character.group.position.copy(DUST2_WAYPOINTS.t_spawn);
      // Randomize route between Long A, Short A, and B Tunnels
      const routeChoices = ['T_TO_A_LONG', 'T_TO_A_SHORT', 'T_TO_B_TUNNELS'];
      const chosen = routeChoices[Math.floor(Math.random() * routeChoices.length)];
      this.route = ROUTES[chosen].map(k => DUST2_WAYPOINTS[k]);
    } else {
      this.character.group.position.copy(DUST2_WAYPOINTS.ct_spawn);
      const routeChoices = ['CT_DEFEND_A', 'CT_DEFEND_B', 'CT_MID_PATROL'];
      const chosen = routeChoices[Math.floor(Math.random() * routeChoices.length)];
      this.route = ROUTES[chosen].map(k => DUST2_WAYPOINTS[k]);
    }
    this.currentWaypointIdx = 0;
  }

  takeDamage(amount, killerName, weaponName, isHeadshot) {
    if (!this.isAlive) return false;
    this.health -= amount;

    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      this.character.updateAnimation(0, false, false, true);
      return true; // Was killed
    }
    return false;
  }

  update(delta, playerPos, playerTeam, isPlayerAlive, onBotShoot) {
    if (!this.isAlive) return;

    const myPos = this.character.group.position;

    // Check if player is an enemy in vision
    let seesEnemy = false;
    if (isPlayerAlive && playerTeam !== this.team) {
      const dist = myPos.distanceTo(playerPos);
      if (dist < 40) {
        // Look at player
        seesEnemy = true;
        const lookTarget = new THREE.Vector3(playerPos.x, myPos.y, playerPos.z);
        this.character.group.lookAt(lookTarget);

        // Burst fire at player
        const now = performance.now() / 1000;
        if (now - this.lastFireTime > 0.45) {
          this.lastFireTime = now;
          soundEngine.playShoot(this.team === 'T' ? 'ak47' : 'm4a1');
          if (onBotShoot) {
            onBotShoot(this, playerPos);
          }
        }
      }
    }

    // Pathfinding movement if not in close combat
    if (!seesEnemy && this.route.length > 0) {
      const targetPoint = this.route[this.currentWaypointIdx];
      if (targetPoint) {
        const moveTarget = new THREE.Vector3(targetPoint.x, myPos.y, targetPoint.z);
        const dist = myPos.distanceTo(moveTarget);

        if (dist < 2.5) {
          // Reached waypoint
          if (this.currentWaypointIdx < this.route.length - 1) {
            this.currentWaypointIdx++;
          }
        } else {
          // Move towards waypoint
          const dir = moveTarget.clone().sub(myPos).normalize();
          myPos.add(dir.multiplyScalar(this.speed * delta));
          this.character.group.lookAt(moveTarget);
          this.character.updateAnimation(delta, true, false, false);
          return;
        }
      }
    }

    this.character.updateAnimation(delta, false, false, false);
  }

  destroy() {
    this.scene.remove(this.character.group);
  }
}

export class BotManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = [];
    this.nextId = 1;
  }

  addBot(team = null, name = null) {
    // If team is null, auto-balance
    if (!team) {
      let tCount = 0;
      let ctCount = 0;
      this.bots.forEach(b => {
        if (b.team === 'T') tCount++;
        else ctCount++;
      });
      team = tCount <= ctCount ? 'T' : 'CT';
    }

    if (!name) {
      const availableNames = CS_BOT_NAMES.filter(n => !this.bots.some(b => b.name === n));
      name = availableNames.length > 0
        ? availableNames[Math.floor(Math.random() * availableNames.length)]
        : 'Bot_' + this.nextId;
    }

    const bot = new Bot('bot_' + (this.nextId++), name, team, this.scene);
    this.bots.push(bot);
    return bot;
  }

  addBots(count = 1) {
    const added = [];
    for (let i = 0; i < count; i++) {
      added.push(this.addBot());
    }
    return added;
  }

  kickAll() {
    const count = this.bots.length;
    this.bots.forEach(b => b.destroy());
    this.bots = [];
    return count;
  }

  kickOne() {
    if (this.bots.length === 0) return null;
    const bot = this.bots.pop();
    bot.destroy();
    return bot;
  }

  respawnAll() {
    this.bots.forEach(b => b.respawn());
  }

  update(delta, playerPos, playerTeam, isPlayerAlive, onBotShoot) {
    for (const bot of this.bots) {
      bot.update(delta, playerPos, playerTeam, isPlayerAlive, onBotShoot);
    }
  }
}

