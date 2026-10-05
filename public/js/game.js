import * as THREE from '../vendor/three.module.js';
import { Dust2Map } from './dust2.js';
import { WeaponManager } from './weapons.js';
import { CharacterModel } from './characters.js';
import { EconomyManager, CS_WEAPONS } from './economy.js';
import { soundEngine } from './audio.js';
import { BotManager } from './bots.js';

export class GameEngine {
  constructor(canvas, network) {
    this.canvas = canvas;
    this.network = network;

    // Local player state
    this.player = {
      name: 'Player',
      team: 'T',
      health: 100,
      armor: 100,
      hasHelmet: false,
      hasDefuser: false,
      isAlive: true,
      hasC4: false,
      isPlanting: false,
      plantProgress: 0,
      isDefusing: false,
      defuseProgress: 0,
      isCrouching: false,
      isWalking: false,
      speed: 12.0,
      crouchSpeed: 5.5,
      walkSpeed: 6.5,
      jumpForce: 10.0,
      gravity: 28.0,
      velocity: new THREE.Vector3(),
      onGround: false,
      cameraHeight: 1.7,
      crouchHeight: 1.0,
      currentHeight: 1.7
    };

    this.economy = new EconomyManager(800);

    // Three.js Core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Pointer Lock & Camera Rotation
    this.yaw = 0;
    this.pitch = 0;
    this.mouseSensitivity = 0.0022;
    this.isLocked = false;

    // Keys state
    this.keys = {};

    // World & Map
    this.map = new Dust2Map(this.scene);
    this.weaponManager = new WeaponManager(this.camera, this.scene);
    this.scene.add(this.camera);

    // Planted C4 in world
    this.plantedC4Mesh = null;
    this.bombState = {
      planted: false,
      position: null,
      site: null,
      timer: 45
    };

    // Remote Players & Bots
    this.remotePlayers = {}; // id -> { data, model }
    this.botManager = new BotManager(this.scene);

    // Particles & FX
    this.bulletTracerGroup = new THREE.Group();
    this.scene.add(this.bulletTracerGroup);

    // Radar Canvas
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.initControls();
    this.initBots();
    this.setupNetworkHandlers();

    // Clock
    this.clock = new THREE.Clock();

    // Responsive resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initControls() {
    this.canvas.addEventListener('click', () => {
      if (!this.isLocked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvas;
      const ch = document.getElementById('crosshair');
      if (ch) ch.style.display = this.isLocked && !this.weaponManager.isScoped ? 'block' : 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));

      this.updateCameraRotation();
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.isLocked || !this.player.isAlive) return;
      soundEngine.init();

      if (e.button === 0) {
        // Left Click -> Shoot or Start Plant
        if (this.weaponManager.currentWeaponId === 'c4') {
          const site = this.map.isInsidePlantZone(this.camera.position);
          if (site) {
            this.player.isPlanting = true;
          }
        } else {
          this.triggerShoot();
        }
      } else if (e.button === 2) {
        // Right Click -> Scope or Burst/Silencer toggle
        e.preventDefault();
        this.weaponManager.toggleScope();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.player.isPlanting = false;
        this.player.plantProgress = 0;
        this.hideActionProgress();
      }
    });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (!this.isLocked) return;

      // Slot keys (1, 2, 3, 4, 5)
      if (e.code === 'Digit1') this.weaponManager.selectSlot(1);
      if (e.code === 'Digit2') this.weaponManager.selectSlot(2);
      if (e.code === 'Digit3') this.weaponManager.selectSlot(3);
      if (e.code === 'Digit4') this.weaponManager.selectSlot(4);
      if (e.code === 'Digit5') this.weaponManager.selectSlot(5);

      // Reload
      if (e.code === 'KeyR') {
        this.weaponManager.reload();
      }

      // Buy Menu
      if (e.code === 'KeyB') {
        this.toggleBuyMenu();
      }

      // Scoreboard (TAB)
      if (e.code === 'Tab') {
        e.preventDefault();
        const sb = document.getElementById('scoreboard');
        if (sb) sb.style.display = 'block';
      }

      // Use / Defuse (E)
      if (e.code === 'KeyE') {
        this.checkDefuseStart();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;

      if (e.code === 'Tab') {
        const sb = document.getElementById('scoreboard');
        if (sb) sb.style.display = 'none';
      }

      if (e.code === 'KeyE') {
        this.player.isDefusing = false;
        this.player.defuseProgress = 0;
        this.hideActionProgress();
      }
    });
  }

  updateCameraRotation() {
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.yaw + this.weaponManager.recoilYaw;
    this.camera.rotation.x = this.pitch + this.weaponManager.recoilPitch;
  }

  get bots() {
    return this.botManager.bots;
  }

  initBots() {
    // Spawn 4 bots initially (2 T, 2 CT) for instant action
    this.botManager.addBots(4);
  }

  setupNetworkHandlers() {
    this.network.on('welcome', (data) => {
      this.player.team = data.players[data.playerId]?.team || 'T';
      this.respawnPlayer();
    });

    this.network.on('player_joined', (p) => {
      if (p.id === this.network.playerId) return;
      this.addRemotePlayer(p);
    });

    this.network.on('player_left', (id) => {
      this.removeRemotePlayer(id);
    });

    this.network.on('player_moved', (data) => {
      const rp = this.remotePlayers[data.id];
      if (rp) {
        rp.targetX = data.x;
        rp.targetY = data.y;
        rp.targetZ = data.z;
        rp.targetYaw = data.yaw;
        rp.model.updateAnimation(0.016, rp.isWalking, data.isCrouching, false);
      }
    });

    this.network.on('player_shot', (data) => {
      soundEngine.playShoot(data.weapon);
      this.createBulletTracer(data.origin, data.direction);
    });

    this.network.on('player_damaged', (data) => {
      if (data.targetId === this.network.playerId) {
        this.takeDamage(data.damage);
      }
    });

    this.network.on('player_killed', (data) => {
      this.addKillfeed(data);
      if (data.victimId === this.network.playerId) {
        this.onDeath();
      }
    });

    this.network.on('bomb_planted', (data) => {
      this.bombState.planted = true;
      this.bombState.site = data.site;
      this.bombState.position = data.position;
      this.spawnPlantedC4(data.position);
      soundEngine.playVoice('Bomb has been planted');
      this.showAnnouncement(`Bomb planted at Site ${data.site}!`);
    });

    this.network.on('bomb_tick', (timer) => {
      this.bombState.timer = timer;
      soundEngine.playBombBeep();
      const c4Display = document.getElementById('c4-timer-display');
      if (c4Display) {
        c4Display.innerText = `C4: ${timer}s`;
        c4Display.style.display = 'block';
      }
    });

    this.network.on('bomb_defused', (data) => {
      this.bombState.planted = false;
      soundEngine.playVoice('Bomb has been defused');
      this.showAnnouncement('Counter-Terrorists Win! (Bomb Defused)');
      if (this.plantedC4Mesh) {
        this.scene.remove(this.plantedC4Mesh);
        this.plantedC4Mesh = null;
      }
    });

    this.network.on('round_start', (data) => {
      this.respawnPlayer();
      this.bots.forEach(b => b.respawn());
      this.showAnnouncement(`Round ${data.roundNumber}`);
    });

    this.network.on('round_end', (data) => {
      const winnerName = data.winner === 'T' ? 'Terrorists' : 'Counter-Terrorists';
      this.showAnnouncement(`${winnerName} Win!`);
      soundEngine.playVoice(`${winnerName} win`);

      const won = this.player.team === data.winner;
      const isBombWin = data.reason === 'bomb_exploded' || data.reason === 'bomb_defused';
      this.economy.onRoundEnd(won, isBombWin, this.bombState.planted);
      this.updateHUD();
    });
  }

  addRemotePlayer(p) {
    if (this.remotePlayers[p.id]) return;
    const model = new CharacterModel(p.team, p.model);
    model.setName(p.name);
    model.group.position.set(p.x, p.y, p.z);
    this.scene.add(model.group);

    this.remotePlayers[p.id] = {
      data: p,
      model: model,
      targetX: p.x,
      targetY: p.y,
      targetZ: p.z,
      targetYaw: p.yaw
    };
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers[id];
    if (rp) {
      this.scene.remove(rp.model.group);
      delete this.remotePlayers[id];
    }
  }

  respawnPlayer() {
    this.player.health = 100;
    this.player.isAlive = true;
    this.player.velocity.set(0, 0, 0);

    // Position player at designated spawn
    if (this.player.team === 'T') {
      this.camera.position.set(-50 + (Math.random() - 0.5) * 6, 1.8, 90 + (Math.random() - 0.5) * 6);
      this.yaw = 0;
    } else {
      this.camera.position.set(30 + (Math.random() - 0.5) * 6, 1.8, -85 + (Math.random() - 0.5) * 6);
      this.yaw = Math.PI;
    }
    this.pitch = 0;
    this.updateCameraRotation();

    // Give default starting loadout if no weapon
    this.weaponManager.equip(this.player.team === 'T' ? 'ak47' : 'm4a1');
    this.updateHUD();
  }

  triggerShoot() {
    const shot = this.weaponManager.shoot();
    if (!shot) return;

    // Bullet Raycast
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

    // Spread cone
    if (shot.spread) {
      dir.x += (Math.random() - 0.5) * shot.spread;
      dir.y += (Math.random() - 0.5) * shot.spread;
      dir.z += (Math.random() - 0.5) * shot.spread;
      dir.normalize();
    }

    // Inform server of shot
    this.network.sendShoot(this.weaponManager.currentWeaponId, origin, dir);
    this.createBulletTracer(origin, dir);

    // Raycast hit check against remote players and bots
    const raycaster = new THREE.Raycaster(origin, dir, 0.5, 300);

    // Check bots
    for (const bot of this.bots) {
      if (!bot.isAlive || bot.team === this.player.team) continue;
      const intersects = raycaster.intersectObject(bot.character.group, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const isHeadshot = hit.object.userData?.isHead === true;
        const damage = isHeadshot ? shot.damage * shot.headshotMultiplier : shot.damage;

        soundEngine.playHit(isHeadshot);

        const killed = bot.takeDamage(damage, this.player.name, shot.weapon.name, isHeadshot);
        if (killed) {
          this.economy.addMoney(shot.weapon.killReward || 300);
          this.addKillfeed({
            killerName: this.player.name,
            killerTeam: this.player.team,
            victimName: `[BOT] ${bot.name}`,
            victimTeam: bot.team,
            weapon: shot.weapon.name,
            isHeadshot: isHeadshot
          });
          this.updateHUD();
        }
        return;
      }
    }

    // Check remote players
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      if (rp.data.team === this.player.team) continue;
      const intersects = raycaster.intersectObject(rp.model.group, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const isHeadshot = hit.object.userData?.isHead === true;
        const damage = isHeadshot ? shot.damage * shot.headshotMultiplier : shot.damage;

        soundEngine.playHit(isHeadshot);
        this.network.sendHit(id, damage, shot.weapon.id, isHeadshot);
        return;
      }
    }
  }

  createBulletTracer(origin, dir) {
    const end = origin.clone().add(dir.clone().multiplyScalar(100));
    const mat = new THREE.LineBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0.8 });
    const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
    const line = new THREE.Line(geo, mat);
    this.bulletTracerGroup.add(line);

    setTimeout(() => {
      this.bulletTracerGroup.remove(line);
      geo.dispose();
      mat.dispose();
    }, 60);
  }

  spawnPlantedC4(pos) {
    if (this.plantedC4Mesh) this.scene.remove(this.plantedC4Mesh);

    const geo = new THREE.BoxGeometry(0.5, 0.25, 0.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb58957, roughness: 0.8 });
    this.plantedC4Mesh = new THREE.Mesh(geo, mat);
    this.plantedC4Mesh.position.set(pos.x, pos.y + 0.12, pos.z);

    // Blinking red light
    const led = new THREE.PointLight(0xff0000, 2, 8);
    led.position.set(pos.x, pos.y + 0.3, pos.z);
    this.plantedC4Mesh.add(led);

    this.scene.add(this.plantedC4Mesh);
  }

  checkDefuseStart() {
    if (!this.bombState.planted || this.player.team !== 'CT' || !this.player.isAlive) return;

    if (this.plantedC4Mesh) {
      const dist = this.camera.position.distanceTo(this.plantedC4Mesh.position);
      if (dist < 4.0) {
        this.player.isDefusing = true;
      }
    }
  }

  takeDamage(amount) {
    if (!this.player.isAlive) return;
    this.player.health = Math.max(0, this.player.health - amount);

    // Red damage flash
    const dmgOverlay = document.getElementById('damage-overlay');
    if (dmgOverlay) {
      dmgOverlay.style.opacity = '1';
      setTimeout(() => { dmgOverlay.style.opacity = '0'; }, 150);
    }

    if (this.player.health <= 0) {
      this.onDeath();
    }
    this.updateHUD();
  }

  onDeath() {
    this.player.isAlive = false;
    soundEngine.playHit(false);
    this.showAnnouncement('You Died!');
  }

  toggleBuyMenu() {
    const buyMenu = document.getElementById('buy-menu');
    if (!buyMenu) return;

    const isOpen = buyMenu.style.display === 'flex';
    buyMenu.style.display = isOpen ? 'none' : 'flex';

    if (!isOpen) {
      document.exitPointerLock();
    } else {
      this.canvas.requestPointerLock();
    }
  }

  showActionProgress(label, percent) {
    const box = document.getElementById('action-progress');
    const lbl = document.getElementById('action-label');
    const fill = document.getElementById('progress-fill');
    if (box && lbl && fill) {
      box.style.display = 'block';
      lbl.innerText = label;
      fill.style.width = `${Math.min(100, percent)}%`;
    }
  }

  hideActionProgress() {
    const box = document.getElementById('action-progress');
    if (box) box.style.display = 'none';
  }

  showAnnouncement(msg) {
    const banner = document.getElementById('announcement-banner');
    if (banner) {
      banner.innerText = msg;
      banner.style.display = 'block';
      setTimeout(() => { banner.style.display = 'none'; }, 3000);
    }
  }

  addKillfeed(k) {
    const feed = document.getElementById('killfeed');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = 'kill-item';
    item.innerHTML = `
      <span class="kill-killer ${k.killerTeam.toLowerCase()}">${k.killerName}</span>
      <span class="kill-weapon">[${k.weapon}]</span>
      ${k.isHeadshot ? '<span class="kill-headshot">&#9760;</span>' : ''}
      <span class="kill-victim ${k.victimTeam.toLowerCase()}">${k.victimName}</span>
    `;
    feed.appendChild(item);

    setTimeout(() => {
      if (item.parentNode) feed.removeChild(item);
    }, 5000);
  }

  updateHUD() {
    const hpElem = document.getElementById('hud-hp-val');
    const armorElem = document.getElementById('hud-armor-val');
    const moneyElem = document.getElementById('hud-money-val');

    if (hpElem) hpElem.innerText = this.player.health;
    if (armorElem) armorElem.innerText = this.player.armor;
    if (moneyElem) moneyElem.innerText = this.economy.money;

    this.weaponManager.updateHUD();
  }

  updatePhysics(delta) {
    if (!this.player.isAlive) return;

    // Movement vectors
    const moveX = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
    const moveZ = (this.keys['KeyS'] ? 1 : 0) - (this.keys['KeyW'] ? 1 : 0);

    this.player.isCrouching = !!this.keys['KeyC'] || !!this.keys['ControlLeft'];
    this.player.isWalking = !!this.keys['ShiftLeft'];

    let speed = this.player.speed;
    if (this.player.isCrouching) speed = this.player.crouchSpeed;
    else if (this.player.isWalking) speed = this.player.walkSpeed;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).normalize();

    const wishDir = forward.multiplyScalar(-moveZ).add(right.multiplyScalar(moveX));
    if (wishDir.lengthSq() > 0) {
      wishDir.normalize();
      this.player.velocity.x = wishDir.x * speed;
      this.player.velocity.z = wishDir.z * speed;
    } else {
      this.player.velocity.x = THREE.MathUtils.lerp(this.player.velocity.x, 0, delta * 14);
      this.player.velocity.z = THREE.MathUtils.lerp(this.player.velocity.z, 0, delta * 14);
    }

    // Jump
    if (this.keys['Space'] && this.player.onGround && !this.player.isCrouching) {
      this.player.velocity.y = this.player.jumpForce;
      this.player.onGround = false;
    }

    // Gravity
    this.player.velocity.y -= this.player.gravity * delta;

    // Apply movement with simple bounding box collision check
    const newPos = this.camera.position.clone();
    newPos.x += this.player.velocity.x * delta;
    newPos.z += this.player.velocity.z * delta;
    newPos.y += this.player.velocity.y * delta;

    // Crouch height transition
    const targetHeight = this.player.isCrouching ? this.player.crouchHeight : this.player.cameraHeight;
    this.player.currentHeight = THREE.MathUtils.lerp(this.player.currentHeight, targetHeight, delta * 12);

    // Floor collision
    if (newPos.y < this.player.currentHeight) {
      newPos.y = this.player.currentHeight;
      this.player.velocity.y = 0;
      this.player.onGround = true;
    }

    // Dust2 Wall Collision Constraint
    const playerRadius = 0.5;
    for (const box of this.map.colliders) {
      if (box.containsPoint(new THREE.Vector3(newPos.x, newPos.y - 0.5, newPos.z))) {
        // Simple slide response
        newPos.x = this.camera.position.x;
        newPos.z = this.camera.position.z;
        break;
      }
    }

    this.camera.position.copy(newPos);

    // Update weapon viewmodel animation
    const isMoving = wishDir.lengthSq() > 0;
    this.weaponManager.update(delta, isMoving, this.player.isCrouching);

    // Send position update over network
    this.network.sendMove(
      this.camera.position,
      this.yaw,
      this.pitch,
      this.player.isCrouching,
      this.player.isWalking
    );

    // Planting Logic
    if (this.player.isPlanting) {
      this.player.plantProgress += delta * 31.25; // ~3.2 seconds
      this.showActionProgress('PLANTING BOMB...', this.player.plantProgress);
      if (this.player.plantProgress >= 100) {
        this.player.isPlanting = false;
        this.hideActionProgress();
        const site = this.map.isInsidePlantZone(this.camera.position) || 'A';
        this.network.sendPlant(site);
      }
    }

    // Defusing Logic
    if (this.player.isDefusing) {
      const defuseRate = this.player.hasDefuser ? 20 : 10; // 5s with kit, 10s without
      this.player.defuseProgress += delta * defuseRate;
      this.showActionProgress('DEFUSING BOMB...', this.player.defuseProgress);
      if (this.player.defuseProgress >= 100) {
        this.player.isDefusing = false;
        this.hideActionProgress();
        this.network.sendDefuse();
      }
    }
  }

  updateRadar() {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Radar Center & Scale
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.55;

    // Draw Crosshairs
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // Draw Bombsites A & B
    const aX = cx + (this.map.bombSites.A.x - this.camera.position.x) * scale;
    const aY = cy + (this.map.bombSites.A.z - this.camera.position.z) * scale;
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('A', aX, aY);

    const bX = cx + (this.map.bombSites.B.x - this.camera.position.x) * scale;
    const bY = cy + (this.map.bombSites.B.z - this.camera.position.z) * scale;
    ctx.fillText('B', bX, bY);

    // Draw Bots
    for (const b of this.bots) {
      if (!b.isAlive) continue;
      const bPos = b.character.group.position;
      const bx = cx + (bPos.x - this.camera.position.x) * scale;
      const by = cy + (bPos.z - this.camera.position.z) * scale;
      ctx.fillStyle = b.team === this.player.team ? '#55ff55' : '#ff3333';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Local Player Triangle
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  render() {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updatePhysics(delta);

    // Update remote player models
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      rp.model.group.position.x = THREE.MathUtils.lerp(rp.model.group.position.x, rp.targetX, delta * 15);
      rp.model.group.position.y = THREE.MathUtils.lerp(rp.model.group.position.y, rp.targetY, delta * 15);
      rp.model.group.position.z = THREE.MathUtils.lerp(rp.model.group.position.z, rp.targetZ, delta * 15);
      rp.model.group.rotation.y = rp.targetYaw;
    }

    // Update bots
    this.botManager.update(
      delta,
      this.camera.position,
      this.player.team,
      this.player.isAlive,
      (b, target) => {
        // Bot shoot callback
        this.createBulletTracer(b.character.group.position, target.clone().sub(b.character.group.position).normalize());
        if (b.team !== this.player.team && Math.random() < 0.28) {
          this.takeDamage(20);
        }
      }
    );

    this.updateRadar();
    this.renderer.render(this.scene, this.camera);
  }
}
