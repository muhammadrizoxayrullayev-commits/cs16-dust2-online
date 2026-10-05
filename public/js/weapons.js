import * as THREE from '../vendor/three.module.js';
import { CS_WEAPONS } from './economy.js';
import { soundEngine } from './audio.js';

export class WeaponManager {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    // Viewmodel root attached to camera
    this.viewmodelRoot = new THREE.Group();
    this.camera.add(this.viewmodelRoot);

    // Current state
    this.currentWeaponId = 'ak47';
    this.currentSlot = 1;
    this.weapons = {}; // inventory: slot -> weapon state
    this.viewmodels = {}; // 3D models for each weapon
    this.isReloading = false;
    this.isFiring = false;
    this.isScoped = false;
    this.lastShotTime = 0;

    // Recoil and spray state
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.spreadAccuracy = 0;

    // Animation timers
    this.recoilKick = 0;
    this.bobTimer = 0;
    this.drawTimer = 0;

    // Muzzle Flash
    this.muzzleLight = new THREE.PointLight(0xffaa33, 0, 10);
    this.muzzleLight.position.set(0.2, -0.15, -0.9);
    this.viewmodelRoot.add(this.muzzleLight);

    this.initInventory();
    this.buildAllViewModels();
    this.equip('ak47');
  }

  initInventory() {
    this.weapons = {
      1: { id: 'ak47', ammo: 30, reserve: 90 },
      2: { id: 'glock', ammo: 20, reserve: 120 },
      3: { id: 'knife', ammo: 1, reserve: 1 },
      4: null,
      5: null // C4
    };
  }

  // Build 3D procedural weapon models
  buildAllViewModels() {
    // Shared materials
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.35, metalness: 0.85 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.45, metalness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e3d1b, roughness: 0.65 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.95 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x3d4d38, roughness: 0.7 });
    const handMat = new THREE.MeshStandardMaterial({ color: 0xd9a47a, roughness: 0.8 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1f261f, roughness: 0.9 });

    // --- 1. AK-47 ---
    const akGroup = new THREE.Group();
    // Receiver
    const akReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.35), steelMat);
    akReceiver.position.set(0, 0, 0);
    akGroup.add(akReceiver);
    // Wooden Buttstock
    const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.28), woodMat);
    akStock.position.set(0, -0.02, 0.3);
    akStock.rotation.x = -0.1;
    akGroup.add(akStock);
    // Wooden Handguard
    const akHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.22), woodMat);
    akHandguard.position.set(0, 0.01, -0.28);
    akGroup.add(akHandguard);
    // Barrel & Front Sight
    const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38), steelMat);
    akBarrel.rotation.x = Math.PI / 2;
    akBarrel.position.set(0, 0.02, -0.42);
    akGroup.add(akBarrel);
    // Curved Banana Magazine
    const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.08), steelMat);
    akMag.position.set(0, -0.14, -0.06);
    akMag.rotation.x = 0.35;
    akGroup.add(akMag);
    // Hands holding AK
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.3), gloveMat);
    rightArm.rotation.set(0.6, 0, -0.2);
    rightArm.position.set(0.14, -0.22, 0.1);
    akGroup.add(rightArm);
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.32), gloveMat);
    leftArm.rotation.set(-0.5, 0.4, 0.5);
    leftArm.position.set(-0.12, -0.16, -0.22);
    akGroup.add(leftArm);

    akGroup.position.set(0.24, -0.24, -0.45);
    this.viewmodels.ak47 = akGroup;
    this.viewmodelRoot.add(akGroup);

    // --- 2. M4A1 (Silenced) ---
    const m4Group = new THREE.Group();
    // Receiver
    const m4Receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.085, 0.32), darkSteelMat);
    m4Group.add(m4Receiver);
    // Carry handle & optic rail
    const m4Handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.15), darkSteelMat);
    m4Handle.position.set(0, 0.06, -0.02);
    m4Group.add(m4Handle);
    // Handguard
    const m4Guard = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24), darkSteelMat);
    m4Guard.rotation.x = Math.PI / 2;
    m4Guard.position.set(0, 0, -0.26);
    m4Group.add(m4Guard);
    // Silencer Can
    const m4Silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.32), steelMat);
    m4Silencer.rotation.x = Math.PI / 2;
    m4Silencer.position.set(0, 0, -0.48);
    m4Group.add(m4Silencer);
    // Mag
    const m4Mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.07), steelMat);
    m4Mag.position.set(0, -0.12, -0.06);
    m4Mag.rotation.x = 0.15;
    m4Group.add(m4Mag);
    // Buttstock
    const m4Stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.22), darkSteelMat);
    m4Stock.position.set(0, -0.01, 0.26);
    m4Group.add(m4Stock);

    m4Group.position.set(0.24, -0.24, -0.45);
    m4Group.visible = false;
    this.viewmodels.m4a1 = m4Group;
    this.viewmodelRoot.add(m4Group);

    // --- 3. AWP Magnum Sniper ---
    const awpGroup = new THREE.Group();
    // Green Sniper Chassis
    const awpBody = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.5), greenMat);
    awpGroup.add(awpBody);
    // Long Heavy Barrel
    const awpBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6), darkSteelMat);
    awpBarrel.rotation.x = Math.PI / 2;
    awpBarrel.position.set(0, 0.02, -0.5);
    awpGroup.add(awpBarrel);
    // Scope Tube
    const awpScope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28), darkSteelMat);
    awpScope.rotation.x = Math.PI / 2;
    awpScope.position.set(0, 0.08, -0.05);
    awpGroup.add(awpScope);
    // Scope Mounts
    const scopeMount1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), steelMat);
    scopeMount1.position.set(0, 0.055, 0.04);
    const scopeMount2 = scopeMount1.clone();
    scopeMount2.position.set(0, 0.055, -0.14);
    awpGroup.add(scopeMount1, scopeMount2);
    // Bolt Handle
    const awpBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06), chromeMat);
    awpBolt.rotation.z = Math.PI / 2;
    awpBolt.position.set(0.045, 0.02, 0.08);
    awpGroup.add(awpBolt);

    awpGroup.position.set(0.24, -0.26, -0.45);
    awpGroup.visible = false;
    this.viewmodels.awp = awpGroup;
    this.viewmodelRoot.add(awpGroup);

    // --- 4. Desert Eagle ---
    const deagleGroup = new THREE.Group();
    // Heavy Chrome Slide
    const deSlide = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.06, 0.26), chromeMat);
    deSlide.position.set(0, 0.03, 0);
    deagleGroup.add(deSlide);
    // Grip
    const deGrip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.14, 0.08), darkSteelMat);
    deGrip.position.set(0, -0.07, 0.06);
    deGrip.rotation.x = 0.25;
    deagleGroup.add(deGrip);

    deagleGroup.position.set(0.2, -0.22, -0.38);
    deagleGroup.visible = false;
    this.viewmodels.deagle = deagleGroup;
    this.viewmodelRoot.add(deagleGroup);

    // --- 5. Glock-18 ---
    const glockGroup = new THREE.Group();
    const glSlide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.2), darkSteelMat);
    glSlide.position.set(0, 0.02, 0);
    glockGroup.add(glSlide);
    const glGrip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.12, 0.065), darkSteelMat);
    glGrip.position.set(0, -0.06, 0.05);
    glGrip.rotation.x = 0.22;
    glockGroup.add(glGrip);

    glockGroup.position.set(0.2, -0.22, -0.38);
    glockGroup.visible = false;
    this.viewmodels.glock = glockGroup;
    this.viewmodelRoot.add(glockGroup);

    // --- 6. Tactical Knife ---
    const knifeGroup = new THREE.Group();
    // Blade
    const knifeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.045, 0.22), chromeMat);
    knifeBlade.position.set(0, 0.02, -0.12);
    knifeGroup.add(knifeBlade);
    // Crossguard
    const knifeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), darkSteelMat);
    knifeGuard.position.set(0, 0.02, -0.01);
    knifeGroup.add(knifeGuard);
    // Handle
    const knifeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14), darkSteelMat);
    knifeHandle.rotation.x = Math.PI / 2;
    knifeHandle.position.set(0, 0.02, 0.07);
    knifeGroup.add(knifeHandle);

    knifeGroup.position.set(0.22, -0.2, -0.35);
    knifeGroup.visible = false;
    this.viewmodels.knife = knifeGroup;
    this.viewmodelRoot.add(knifeGroup);

    // --- 7. C4 Explosive ---
    const c4Group = new THREE.Group();
    // C4 Block (Plastic explosive)
    const c4Block = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), new THREE.MeshStandardMaterial({ color: 0x9c835a }));
    c4Group.add(c4Block);
    // Digital LCD Timer
    const c4Lcd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    c4Lcd.position.set(0, 0.045, -0.02);
    c4Group.add(c4Lcd);
    // Blinking Red LED
    const c4Led = new THREE.Mesh(new THREE.SphereGeometry(0.008), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    c4Led.position.set(0.03, 0.045, 0.04);
    c4Group.add(c4Led);

    c4Group.position.set(0.18, -0.22, -0.35);
    c4Group.visible = false;
    this.viewmodels.c4 = c4Group;
    this.viewmodelRoot.add(c4Group);
  }

  equip(weaponId) {
    if (!this.viewmodels[weaponId]) return;

    // Hide all viewmodels
    for (const id in this.viewmodels) {
      this.viewmodels[id].visible = false;
    }

    this.currentWeaponId = weaponId;
    this.viewmodels[weaponId].visible = true;
    this.isReloading = false;
    this.isScoped = false;
    this.drawTimer = 0.3; // 300ms draw animation

    // Unscope sniper overlay
    const scopeElem = document.getElementById('sniper-scope');
    if (scopeElem) scopeElem.style.display = 'none';

    this.updateHUD();
  }

  selectSlot(slotNum) {
    const inv = this.weapons[slotNum];
    if (inv && inv.id) {
      this.currentSlot = slotNum;
      this.equip(inv.id);
    }
  }

  getCurrentWeaponData() {
    return CS_WEAPONS[this.currentWeaponId] || CS_WEAPONS.ak47;
  }

  getCurrentInv() {
    return this.weapons[this.currentSlot];
  }

  canShoot() {
    if (this.isReloading || this.drawTimer > 0) return false;
    const now = performance.now() / 1000;
    const data = this.getCurrentWeaponData();
    if (now - this.lastShotTime < data.fireRate) return false;

    const inv = this.getCurrentInv();
    if (data.category === 'knife') return true;
    return inv && inv.ammo > 0;
  }

  shoot() {
    if (!this.canShoot()) {
      if (this.getCurrentInv()?.ammo === 0) {
        this.reload();
      }
      return null;
    }

    const now = performance.now() / 1000;
    this.lastShotTime = now;
    const data = this.getCurrentWeaponData();
    const inv = this.getCurrentInv();

    if (data.category === 'knife') {
      soundEngine.playKnifeSlash();
      this.recoilKick = 0.08;
      return { weapon: data, isMelee: true };
    }

    // Decrement ammo
    inv.ammo--;
    this.updateHUD();

    // Play procedural gunfire sound
    soundEngine.playShoot(data.id);

    // Visual Recoil Kick
    this.recoilKick = data.recoil * 3.5;
    this.recoilPitch += data.recoil;
    this.recoilYaw += (Math.random() - 0.5) * data.recoil * 0.8;

    // Flash light
    this.muzzleLight.intensity = 3.5;
    setTimeout(() => { this.muzzleLight.intensity = 0; }, 40);

    return {
      weapon: data,
      spread: data.spread,
      damage: data.damage,
      headshotMultiplier: data.headshotMultiplier
    };
  }

  toggleScope() {
    const data = this.getCurrentWeaponData();
    if (!data.isSniper) return;

    this.isScoped = !this.isScoped;
    const scopeElem = document.getElementById('sniper-scope');
    const chElem = document.getElementById('crosshair');

    if (this.isScoped) {
      if (scopeElem) scopeElem.style.display = 'block';
      if (chElem) chElem.style.display = 'none';
      this.camera.fov = 25; // Zoom in
      this.viewmodels[this.currentWeaponId].visible = false;
    } else {
      if (scopeElem) scopeElem.style.display = 'none';
      if (chElem) chElem.style.display = 'block';
      this.camera.fov = 75; // Standard FOV
      this.viewmodels[this.currentWeaponId].visible = true;
    }
    this.camera.updateProjectionMatrix();
  }

  reload() {
    const data = this.getCurrentWeaponData();
    const inv = this.getCurrentInv();
    if (this.isReloading || !inv || data.category === 'knife') return;
    if (inv.ammo >= data.clipSize || inv.reserve <= 0) return;

    this.isReloading = true;
    if (this.isScoped) this.toggleScope();

    soundEngine.playReloadClick(1);
    setTimeout(() => soundEngine.playReloadClick(2), 700);

    setTimeout(() => {
      const needed = data.clipSize - inv.ammo;
      const take = Math.min(needed, inv.reserve);
      inv.ammo += take;
      inv.reserve -= take;
      this.isReloading = false;
      this.updateHUD();
    }, (data.reloadTime || 2.5) * 1000);
  }

  updateHUD() {
    const inv = this.getCurrentInv();
    const ammoElem = document.getElementById('hud-ammo-val');
    const reserveElem = document.getElementById('hud-reserve-val');
    const weaponElem = document.getElementById('hud-weapon-name');

    if (ammoElem && inv) {
      ammoElem.innerText = inv.ammo;
    }
    if (reserveElem && inv) {
      reserveElem.innerText = inv.reserve;
    }
    if (weaponElem) {
      weaponElem.innerText = this.getCurrentWeaponData().name;
    }
  }

  update(delta, isMoving, isCrouching) {
    if (this.drawTimer > 0) {
      this.drawTimer -= delta;
    }

    // Viewmodel Breathing & Walking Sway
    const currentMesh = this.viewmodels[this.currentWeaponId];
    if (currentMesh && currentMesh.visible) {
      if (isMoving) {
        this.bobTimer += delta * 12;
      } else {
        this.bobTimer += delta * 2;
      }

      const bobX = Math.sin(this.bobTimer) * (isMoving ? 0.015 : 0.002);
      const bobY = Math.abs(Math.cos(this.bobTimer)) * (isMoving ? 0.02 : 0.003);

      // Recoil recovery
      this.recoilKick = THREE.MathUtils.lerp(this.recoilKick, 0, delta * 15);
      this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, delta * 8);
      this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, delta * 8);

      // Apply viewmodel transforms
      currentMesh.position.x = 0.24 + bobX;
      currentMesh.position.y = -0.24 - bobY + (this.isReloading ? -0.1 : 0);
      currentMesh.position.z = -0.45 + this.recoilKick;

      currentMesh.rotation.x = this.recoilKick * 2;
      currentMesh.rotation.y = bobX * 2;
    }
  }
}
