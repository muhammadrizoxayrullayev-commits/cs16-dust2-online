import * as THREE from '../vendor/three.module.js';

export class CharacterModel {
  constructor(team = 'T', modelType = 'phoenix') {
    this.team = team;
    this.modelType = modelType;

    this.group = new THREE.Group();
    this.animTime = 0;
    this.isDead = false;

    this.buildMesh();
  }

  buildMesh() {
    const isT = this.team === 'T';

    // Materials
    // T: Crimson/Brown camo jacket, olive pants, black balaclava
    // CT: Navy tactical suit, helmet/visor, black vest
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a47a, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const headMat = isT
      ? new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }) // Balaclava
      : new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.5, metalness: 0.4 }); // Combat Helmet

    const visorMat = new THREE.MeshStandardMaterial({ color: 0x113355, roughness: 0.2, metalness: 0.8 });

    const torsoMat = isT
      ? new THREE.MeshStandardMaterial({ color: 0x7a3a22, roughness: 0.8 }) // Phoenix Brown/Red vest
      : new THREE.MeshStandardMaterial({ color: 0x1e2b38, roughness: 0.6 }); // CT Navy Kevlar

    const legMat = isT
      ? new THREE.MeshStandardMaterial({ color: 0x474a38, roughness: 0.85 }) // Olive cargo pants
      : new THREE.MeshStandardMaterial({ color: 0x182028, roughness: 0.85 }); // Dark navy pants

    const vestMat = isT
      ? new THREE.MeshStandardMaterial({ color: 0x3d382e, roughness: 0.8 })
      : new THREE.MeshStandardMaterial({ color: 0x0f151c, roughness: 0.6 });

    // Root pelvis
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.9;
    this.group.add(this.pelvis);

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.28), torsoMat);
    this.torso.position.y = 0.32;
    this.torso.castShadow = true;
    this.pelvis.add(this.torso);

    // Tactical Vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.32), vestMat);
    vest.position.set(0, 0.05, 0);
    this.torso.add(vest);

    // Head
    this.head = new THREE.Group();
    this.head.position.y = 0.45;
    this.torso.add(this.head);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), headMat);
    headMesh.position.y = 0.14;
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Head hit box tag for headshots
    headMesh.userData = { isHead: true };

    if (!isT) {
      // CT Helmet Visor / Goggles
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.06), visorMat);
      visor.position.set(0, 0.14, 0.15);
      this.head.add(visor);
    } else {
      // Terrorist eye slit
      const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), skinMat);
      eyeSlit.position.set(0, 0.14, 0.145);
      this.head.add(eyeSlit);
    }

    // Arms
    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.32, 0.25, 0);
    this.torso.add(this.leftArm);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), torsoMat);
    leftArmMesh.position.y = -0.22;
    this.leftArm.add(leftArmMesh);

    // Right Arm (Holding Gun)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.32, 0.25, 0);
    this.torso.add(this.rightArm);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), torsoMat);
    rightArmMesh.position.y = -0.22;
    this.rightArm.add(rightArmMesh);

    // Weapon proxy in right hand
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    this.gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.6), gunMat);
    this.gunMesh.position.set(0, -0.45, 0.22);
    this.gunMesh.rotation.x = -0.2;
    this.rightArm.add(this.gunMesh);

    // Legs
    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0, 0);
    this.pelvis.add(this.leftLeg);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), legMat);
    leftLegMesh.position.y = -0.375;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.2, 0.26), bootMat);
    leftBoot.position.set(0, -0.7, 0.04);
    this.leftLeg.add(leftBoot);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0, 0);
    this.pelvis.add(this.rightLeg);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), legMat);
    rightLegMesh.position.y = -0.375;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);
    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.2, 0.26), bootMat);
    rightBoot.position.set(0, -0.7, 0.04);
    this.rightLeg.add(rightBoot);

    // Name Plate Billboard
    this.nameSprite = this.createNameSprite('Player');
    this.nameSprite.position.set(0, 2.05, 0);
    this.group.add(this.nameSprite);
  }

  createNameSprite(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.team === 'T' ? '#e5973b' : '#58a0e8';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  setName(name) {
    if (this.nameSprite) {
      this.group.remove(this.nameSprite);
    }
    this.nameSprite = this.createNameSprite(name);
    this.nameSprite.position.set(0, 2.05, 0);
    this.group.add(this.nameSprite);
  }

  updateAnimation(delta, isMoving, isCrouching, isDead = false) {
    if (isDead) {
      if (!this.isDead) {
        this.isDead = true;
        // Ragdoll fall backwards
        this.group.rotation.x = -Math.PI / 2;
        this.group.position.y = 0.2;
      }
      return;
    }

    if (this.isDead) {
      this.isDead = false;
      this.group.rotation.x = 0;
    }

    // Crouch height adjustment
    if (isCrouching) {
      this.pelvis.position.y = 0.55;
      this.leftLeg.rotation.x = -0.7;
      this.rightLeg.rotation.x = -0.7;
    } else {
      this.pelvis.position.y = 0.9;
    }

    if (isMoving && !isCrouching) {
      this.animTime += delta * 10;
      const legAngle = Math.sin(this.animTime) * 0.6;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      this.leftArm.rotation.x = -legAngle * 0.7;
      this.rightArm.rotation.x = -0.5 + legAngle * 0.2;
    } else if (!isCrouching) {
      // Idle pose
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0.1;
      this.rightArm.rotation.x = -0.5; // Aiming forward
    }
  }
}
