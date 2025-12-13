// ShipComponents.js - Spaceship with orbital movement
AFRAME.registerComponent('spaceship', {
  schema: {
    speed: { type: 'number', default: 50}
  },

  init: function() {
    console.log('🚀 Spaceship initializing...');
    
    this.angle = 0;
    this.orbitRadius = 55;
    this.orbitHeight = 0;
    this.angularVelocity = 0;
    this.verticalVelocity = 0;
    this.currentYaw = 0;
    this.currentPitch = 0;
    this.currentRoll = 0;
    this.modelLoaded = false;
    this.modelLoadFailed = false;
    
  // TRAIL PROPERTIES
  this.trailPoints = [];
  this.maxTrailLength = 10000; // ← More particles
  this.spawnInterval = 50; // ← Spawn faster (was 50)
  this.lastSpawnTime = 0;
  this.lastPosition = new THREE.Vector3();

    this.loadModel();
    
    this.loadTimeout = setTimeout(() => {
      if (!this.modelLoaded && !this.modelLoadFailed) {
        console.warn('⚠️ Spaceship model timeout, using simple mesh');
        this.createFallbackShip();
      }
    }, 3000);
    
    this.setupControls();
    this.updateOrbitalPosition();
    
    console.log('✅ Spaceship initialized at:', this.el.object3D.position);
  },

  setupControls: function() {
    this.keys = {};
    
    window.addEventListener('keydown', (e) => {
      if (e.key.startsWith('Arrow')) {
        this.keys[e.key] = true;
        e.preventDefault();
        console.log('🎮 Key pressed:', e.key);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (e.key.startsWith('Arrow')) {
        this.keys[e.key] = false;
      }
    });
    
    console.log('🎮 Controls set up');
  },

  tick: function(time, deltaTime) {
    const dt = Math.min(deltaTime / 1000, 0.1);

    // Update animation mixer for engine rotation
    if (this.mixer) {
      this.mixer.update(dt);
    }

    // TRAIL SYSTEM
    const currentPos = this.el.object3D.position.clone();
    const distance = currentPos.distanceTo(this.lastPosition);
    
    // Spawn trail particles at intervals when moving
    if (time - this.lastSpawnTime > this.spawnInterval && distance > 0.1) {
      this.createTrailParticle();
      this.lastSpawnTime = time;
      this.lastPosition.copy(currentPos);
    }
    
    // Update existing trail particles
    this.updateTrail();

    // ===== ORBITAL MOVEMENT =====
    const speed = this.data.speed;
    const rotationSpeed = 1.5;
    const verticalSpeed = 25;
    const drag = 0.97;
    const yawSpeed = 3;
    
    let isMovingHorizontal = false;
    let targetYaw = 0;
    
    // Horizontal movement (orbit around Earth)
    if (this.keys['ArrowLeft']) {
      this.angularVelocity += rotationSpeed * dt;
      targetYaw = Math.PI / 12; 
      isMovingHorizontal = true;
    }
    if (this.keys['ArrowRight']) {
      this.angularVelocity -= rotationSpeed * dt;
      targetYaw = -Math.PI / 12;
      isMovingHorizontal = true;
    }
    
    // Vertical movement (up/down in orbit)
    if (this.keys['ArrowUp']) {
      this.verticalVelocity += verticalSpeed * dt;
    }
    if (this.keys['ArrowDown']) {
      this.verticalVelocity -= verticalSpeed * dt;
    }
    
    // Apply drag
    this.angularVelocity *= drag;
    this.verticalVelocity *= drag;
    
    // Update angle (position on orbit)
    this.angle += this.angularVelocity * dt;
    
    // Keep angle in 0-2π range
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    if (this.angle < 0) this.angle += Math.PI * 2;
    
    // Update height
    this.orbitHeight += this.verticalVelocity * dt;
    this.orbitHeight = Math.max(-8, Math.min(8, this.orbitHeight));
    
    // Update position
    this.updateOrbitalPosition();
    
    // ===== ALWAYS LOOK AT EARTH (NO FLIPPING) =====
    const earthPosition = new THREE.Vector3(0, 0, 0);
    const shipPosition = this.el.object3D.position.clone();

    // Calculate direction to Earth
    const direction = new THREE.Vector3();
    direction.subVectors(earthPosition, shipPosition).normalize();

    // Create proper up vector (always point "up" in world space)
    const up = new THREE.Vector3(0, 1, 0);

    // Create a matrix that looks at Earth with correct orientation
    const matrix = new THREE.Matrix4();
    matrix.lookAt(shipPosition, earthPosition, up);

    // Apply rotation from matrix
    const quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(matrix);
    this.el.object3D.quaternion.copy(quaternion);

    // Add roll when moving horizontally (banking)
    if (isMovingHorizontal) {
      this.currentRoll += (targetYaw - this.currentRoll) * yawSpeed * dt;
    } else {
      this.currentRoll += (0 - this.currentRoll) * yawSpeed * dt;
    }
    this.el.object3D.rotation.z += this.currentRoll;

    // Add slight pitch based on vertical movement
    const pitchAdjust = this.verticalVelocity * 0.05;
    this.el.object3D.rotateOnAxis(new THREE.Vector3(1, 0, 0), pitchAdjust);
  },

  updateOrbitalPosition: function() {
    const x = Math.cos(this.angle) * this.orbitRadius;
    const z = Math.sin(this.angle) * this.orbitRadius;
    const y = this.orbitHeight;
    
    this.el.object3D.position.set(x, y, z);
  },

  loadModel: function() {
    const modelEl = document.createElement('a-entity');
    modelEl.setAttribute('gltf-model', './assets/spaceship/scene.gltf');
    modelEl.setAttribute('scale', '0.05 0.05 0.05');
    modelEl.setAttribute('rotation', '0 180 0');
    
    modelEl.addEventListener('model-loaded', (e) => {
      console.log('✅ Spaceship model loaded');
      this.modelLoaded = true;
      this.onModelLoaded(e);
      clearTimeout(this.loadTimeout);
    });
    
    modelEl.addEventListener('model-error', () => {
      console.error('❌ Spaceship model failed');
      this.modelLoadFailed = true;
      clearTimeout(this.loadTimeout);
      this.createFallbackShip();
    });
    
    this.el.appendChild(modelEl);
    this.modelEl = modelEl;
  },

  onModelLoaded: function(e) {
    const model = this.modelEl.components['gltf-model'].model;
    
    // Setup animation mixer for engine animation
    if (model && model.animations && model.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);
      
      // Find "Take 001" animation (engine rotation)
      const engineAnimation = model.animations.find(clip => 
        clip.name.includes('Take 001') || 
        clip.name.toLowerCase().includes('take')
      ) || model.animations[0];
      
      if (engineAnimation) {
        this.engineAction = this.mixer.clipAction(engineAnimation);
        this.engineAction.setLoop(THREE.LoopRepeat); // Loop forever
        this.engineAction.play(); // Start playing immediately
        console.log('✅ Engine animation playing:', engineAnimation.name);
      }
    } else {
      console.warn('⚠️ No animations found in model');
    }
  },

  createFallbackShip: function() {
    if (this.modelEl && this.modelEl.parentNode) {
      this.modelEl.parentNode.removeChild(this.modelEl);
      this.modelEl = null;
    }
    
    const group = new THREE.Group();
    
    const bodyGeometry = new THREE.ConeGeometry(0.5, 2, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00AAFF,
      emissive: 0x0066FF,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI;
    group.add(body);
    
    this.el.setObject3D('mesh', group);
    console.log('🚀 Using fallback spaceship');
  },

  createTrailParticle: function() {
    const shipPos = this.el.object3D.position.clone();
    
    // ADD RANDOM SPREAD
    const spread = 1.5; // Adjust this for more/less spread
    shipPos.x += (Math.random() - 0.5) * spread;
    shipPos.y += (Math.random() - 0.5) * spread;
    shipPos.z += (Math.random() - 0.5) * spread;
    
    const particle = document.createElement('a-entity');
    particle.setAttribute('geometry', {
      primitive: 'sphere',
      radius: 0.001 + Math.random() * 0.1// Random size variation
    });
    
    // 🌈 RANDOM COLOR VARIATION
    const colors = ['#00AAFF', '#0084ff', '#0088FF', '#023E8A', '#0096FF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    particle.setAttribute('material', {
      color: randomColor,
      transparent: true,
      opacity: 0.6 + Math.random() * 0.2,
      shader: 'flat'
    });
    
    particle.object3D.position.copy(shipPos);
    this.el.sceneEl.appendChild(particle);
    
    this.trailPoints.push({
      el: particle,
      createdAt: Date.now(),
      lifetime: 600 + Math.random() * 400, // Random lifetime 600-1000ms
      initialOpacity: 0.6 + Math.random() * 0.2
    });

    // Limit trail length
    if (this.trailPoints.length > this.maxTrailLength) {
      const old = this.trailPoints.shift();
      if (old.el.parentNode) {
        old.el.parentNode.removeChild(old.el);
      }
    }
  },

  updateTrail: function() {
    const now = Date.now();
    
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const point = this.trailPoints[i];
      const age = now - point.createdAt;
      
      if (age > point.lifetime) {
        // Remove expired particle
        if (point.el.parentNode) {
          point.el.parentNode.removeChild(point.el);
        }
        this.trailPoints.splice(i, 1);
      } else {
        // Fade out and shrink
        const fadeProgress = age / point.lifetime;
        const opacity = point.initialOpacity * (1 - fadeProgress);
        const scale = 1 - (fadeProgress * 0.5);
        
        point.el.setAttribute('material', 'opacity', opacity);
        point.el.object3D.scale.set(scale, scale, scale);
      }
    }
  }
});
