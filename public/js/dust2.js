import * as THREE from '../vendor/three.module.js';

// Texture Synthesizers for Dust2 aesthetic
function createSandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#c8b088';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle sand noise
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.floor(Math.random() * 25) - 12;
    ctx.fillStyle = `rgb(${200 + shade}, ${176 + shade}, ${136 + shade})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

function createWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#bda077';
  ctx.fillRect(0, 0, 512, 512);

  // Sandstone block lines
  ctx.strokeStyle = '#856f4d';
  ctx.lineWidth = 4;

  const rows = 8;
  const cols = 4;
  const rowHeight = 512 / rows;
  const colWidth = 512 / cols;

  for (let r = 0; r <= rows; r++) {
    const y = r * rowHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    if (r < rows) {
      const offset = (r % 2) * (colWidth / 2);
      for (let c = 0; c <= cols; c++) {
        const x = c * colWidth + offset;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowHeight);
        ctx.stroke();
      }
    }
  }

  // Weathering and grain
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const noise = Math.random() * 20 - 10;
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.15})`;
    ctx.fillRect(x, y, 3, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createCrateTexture(label = 'DUST') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Wood planks base
  ctx.fillStyle = '#805a36';
  ctx.fillRect(0, 0, 256, 256);

  // Planks
  ctx.strokeStyle = '#53381e';
  ctx.lineWidth = 4;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Metal corner brackets
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, 256, 12);
  ctx.fillRect(0, 244, 256, 12);
  ctx.fillRect(0, 0, 12, 256);
  ctx.fillRect(244, 0, 12, 256);

  // Diagonal brace
  ctx.strokeStyle = '#5c4024';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(12, 12);
  ctx.lineTo(244, 244);
  ctx.stroke();

  // Stencil text
  ctx.fillStyle = '#222';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 140);

  return new THREE.CanvasTexture(canvas);
}

function createMetalDoorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4a544a';
  ctx.fillRect(0, 0, 256, 512);

  // Panels
  ctx.strokeStyle = '#2b332b';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 236, 492);
  ctx.strokeRect(20, 20, 216, 220);
  ctx.strokeRect(20, 260, 216, 230);

  // Rivets
  ctx.fillStyle = '#222';
  for (let y = 30; y < 490; y += 40) {
    ctx.beginPath();
    ctx.arc(18, y, 4, 0, Math.PI * 2);
    ctx.arc(238, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

export class Dust2Map {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.bombSites = {
      A: { x: 40, y: 0, z: -35, radius: 12 },
      B: { x: -60, y: 0, z: -50, radius: 12 }
    };

    // Shared materials
    this.sandMat = new THREE.MeshLambertMaterial({ map: createSandTexture() });
    this.wallMat = new THREE.MeshLambertMaterial({ map: createWallTexture() });
    this.crateMat = new THREE.MeshLambertMaterial({ map: createCrateTexture('CRATE 45') });
    this.doorMat = new THREE.MeshLambertMaterial({ map: createMetalDoorTexture() });
    this.siteAMat = new THREE.MeshLambertMaterial({ map: createCrateTexture('SITE A') });
    this.siteBMat = new THREE.MeshLambertMaterial({ map: createCrateTexture('SITE B') });

    this.buildMap();
  }

  addCollider(box) {
    this.colliders.push(box);
  }

  addBlock(x, y, z, w, h, d, material = this.wallMat, receivesShadow = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = receivesShadow;
    this.scene.add(mesh);

    // Bounding box for collisions
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.addCollider(box);

    return mesh;
  }

  buildMap() {
    // 1. Skybox / Ambient Atmosphere
    this.scene.background = new THREE.Color(0x99ccff);
    this.scene.fog = new THREE.FogExp2(0xd6c29e, 0.0035);

    // Directional Sunlight (Desert Sun)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    sunLight.position.set(100, 150, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xfff0dd, 0x7c694a, 0.7);
    this.scene.add(hemiLight);

    // 2. Ground Floor
    const groundGeo = new THREE.PlaneGeometry(350, 350);
    const groundMesh = new THREE.Mesh(groundGeo, this.sandMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Ground floor collision plane
    const groundBox = new THREE.Box3(
      new THREE.Vector3(-180, -10, -180),
      new THREE.Vector3(180, 0, 180)
    );
    this.addCollider(groundBox);

    // 3. Map Outer Perimeter Walls
    const wallH = 16;
    this.addBlock(0, 0, 120, 260, wallH, 6);   // South (T Spawn back)
    this.addBlock(0, 0, -120, 260, wallH, 6);  // North (CT Spawn back)
    this.addBlock(-90, 0, 0, 6, wallH, 240);   // West (B side)
    this.addBlock(80, 0, 0, 6, wallH, 240);    // East (Long A side)

    // ==========================================
    // 4. T TERRORIST SPAWN AREA (Z: 70 to 110)
    // ==========================================
    // T Spawn divider walls
    this.addBlock(-20, 0, 85, 40, wallH, 4);
    this.addBlock(-60, 0, 75, 4, wallH, 50);

    // T Spawn decorative crates
    this.addBlock(-48, 0, 92, 3, 3, 3, this.crateMat);
    this.addBlock(-45, 0, 92, 3, 3, 3, this.crateMat);
    this.addBlock(-46.5, 3, 92, 3, 3, 3, this.crateMat);

    // ==========================================
    // 5. LONG A (Outside Long, Long Doors, Pit)
    // ==========================================
    // Wall separating Long A and Middle
    this.addBlock(20, 0, 30, 4, wallH, 110);

    // Long A Double Doors
    this.addBlock(45, 0, 60, 30, wallH, 4);
    // Doors opening frame
    this.addBlock(40, 0, 60, 4, 8, 2, this.doorMat);
    this.addBlock(50, 0, 60, 4, 8, 2, this.doorMat);

    // Long A Pit (Depressed area at x: 60, z: 20)
    // Pit side walls
    this.addBlock(70, 0, 15, 12, 4, 25);
    // Long corner crates
    this.addBlock(55, 0, -5, 4, 4, 4, this.crateMat);
    this.addBlock(55, 4, -5, 4, 4, 4, this.crateMat);

    // ==========================================
    // 6. BOMBSITE A
    // ==========================================
    // Site A elevated platform
    this.addBlock(40, 0, -35, 35, 3, 35);

    // Ramp leading up to Site A from Long
    this.addBlock(40, 0, -12, 16, 1.5, 12);

    // Iconic A Site Boxes (Cover crates)
    this.addBlock(44, 3, -32, 4, 4, 4, this.siteAMat);
    this.addBlock(40, 3, -32, 4, 4, 4, this.crateMat);
    this.addBlock(44, 7, -32, 4, 4, 4, this.crateMat);

    this.addBlock(32, 3, -42, 3.5, 3.5, 3.5, this.crateMat);

    // Goose Wall / Back Corner
    this.addBlock(58, 3, -48, 4, wallH - 3, 20);

    // ==========================================
    // 7. CATWALK & SHORT A
    // ==========================================
    // Elevated walkway from Mid to Site A
    this.addBlock(15, 0, -25, 8, 3, 40);
    this.addBlock(15, 0, 0, 8, 3, 20);

    // Catwalk stairs
    this.addBlock(15, 0, 14, 8, 1.5, 8);

    // Short A wall overlooking mid
    this.addBlock(10, 3, -20, 2, 2.5, 30);

    // ==========================================
    // 8. MIDDLE (MID DOORS & SUICIDE)
    // ==========================================
    // Suicide alley from T Spawn
    this.addBlock(-10, 0, 50, 4, wallH, 40);

    // Mid Double Doors with slit
    this.addBlock(-12, 0, 0, 14, wallH, 4); // Left wall
    this.addBlock(6, 0, 0, 12, wallH, 4);   // Right wall
    // The famous wooden/metal doors
    this.addBlock(-4, 0, 0, 4, 9, 1.5, this.doorMat);
    this.addBlock(1, 0, 0, 4, 9, 1.5, this.doorMat);

    // Iconic Xbox Crate in Mid (for jumping to Catwalk)
    this.addBlock(4, 0, 8, 4.5, 4.5, 4.5, this.crateMat);

    // Mid to Lower Tunnels entrance
    this.addBlock(-25, 0, 10, 4, wallH, 30);

    // ==========================================
    // 9. TUNNELS (UPPER & LOWER)
    // ==========================================
    // Lower Tunnels
    this.addBlock(-40, 0, 15, 25, 8, 4);
    this.addBlock(-40, 0, 35, 25, 8, 4);

    // Upper Tunnels (Tunnel leading to B)
    this.addBlock(-65, 0, 50, 4, 10, 50);
    this.addBlock(-45, 0, 50, 4, 10, 50);
    // Tunnel Ceiling
    this.addBlock(-55, 9, 50, 24, 2, 50);

    // Upper Tunnel to B site exit
    this.addBlock(-55, 0, 5, 24, 10, 4);

    // ==========================================
    // 10. BOMBSITE B
    // ==========================================
    // Bombsite B elevated floor & boundary walls
    this.addBlock(-60, 0, -50, 45, 2, 45);

    // B Doors (CT entrance to B)
    this.addBlock(-45, 0, -70, 4, 9, 2, this.doorMat);
    this.addBlock(-35, 0, -70, 16, wallH, 4);

    // B Window
    this.addBlock(-55, 0, -70, 14, wallH, 4);
    this.addBlock(-49, 3, -70, 4, 3, 2); // Window ledge

    // Iconic B Crates
    this.addBlock(-62, 2, -45, 4, 4, 4, this.siteBMat);
    this.addBlock(-58, 2, -45, 4, 4, 4, this.crateMat);
    this.addBlock(-60, 6, -45, 4, 4, 4, this.crateMat);

    // B Site back boxes
    this.addBlock(-75, 2, -60, 4, 4, 4, this.crateMat);
    this.addBlock(-75, 2, -56, 4, 4, 4, this.crateMat);

    // ==========================================
    // 11. CT COUNTER-TERRORIST SPAWN
    // ==========================================
    // CT Spawn behind Mid Doors and under A Ramp
    this.addBlock(30, 0, -85, 30, 0.5, 30);
    // CT Wall to A Ramp
    this.addBlock(10, 0, -85, 4, wallH, 30);
    this.addBlock(45, 0, -85, 4, wallH, 30);

    // Ramp from CT spawn up to Site A
    this.addBlock(35, 0, -60, 12, 1.5, 16);

    // CT Spawn cover crates
    this.addBlock(28, 0, -80, 3, 3, 3, this.crateMat);
    this.addBlock(32, 0, -80, 3, 3, 3, this.crateMat);

    // Visual Plant Site Zone Markers (Glowing Holograms)
    this.createPlantSiteMarker(this.bombSites.A.x, 3.1, this.bombSites.A.z, 'A');
    this.createPlantSiteMarker(this.bombSites.B.x, 2.1, this.bombSites.B.z, 'B');
  }

  createPlantSiteMarker(x, y, z, label) {
    // Glowing ring on ground
    const ringGeo = new THREE.RingGeometry(5, 5.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y, z);
    this.scene.add(ring);

    // Floating pulsing letter
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff2222';
    ctx.font = 'bold 90px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 64);

    const spriteMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0.8
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y + 4, z);
    sprite.scale.set(6, 6, 1);
    this.scene.add(sprite);
  }

  isInsidePlantZone(pos) {
    const distA = Math.hypot(pos.x - this.bombSites.A.x, pos.z - this.bombSites.A.z);
    if (distA <= this.bombSites.A.radius) return 'A';

    const distB = Math.hypot(pos.x - this.bombSites.B.x, pos.z - this.bombSites.B.z);
    if (distB <= this.bombSites.B.radius) return 'B';

    return null;
  }
}
