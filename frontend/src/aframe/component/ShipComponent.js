AFRAME.registerComponent('spaceship', {
  schema: {
    speed: { type: 'number', default: 50}
  },

  init: function() {
    console.log('🚀 Spaceship initializing...');
    
    this.modelLoaded = false;
    this.modelLoadFailed = false;
    
    this.loadModel();
    
    this.loadTimeout = setTimeout(() => {
      if (!this.modelLoaded && !this.modelLoadFailed) {
        console.warn('⚠️ Spaceship model timeout, using simple mesh');
        this.createFallbackShip();
      }
    }, 3000);
    
    console.log('✅ Spaceship initialized at:', this.el.object3D.position);
  },

  tick: function(time, deltaTime) {
    const dt = Math.min(deltaTime / 1000, 0.1);

    // Update animation mixer for engine rotation if model has animations
    if (this.mixer) {
      this.mixer.update(dt);
    }
  },

  loadModel: function() {
    const modelEl = document.createElement('a-entity');
    modelEl.setAttribute('gltf-model', '/assets/spaceship/scene.gltf');
    modelEl.setAttribute('scale', '0.05 0.05 0.05');
    // Removed hardcoded rotation to allow parent control
    
    modelEl.addEventListener('model-loaded', (e) => {
      console.log('Spaceship model loaded');
      this.modelLoaded = true;
      this.onModelLoaded(e);
      clearTimeout(this.loadTimeout);
    });
    
    modelEl.addEventListener('model-error', () => {
      console.error('Spaceship model failed');
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
  }
});
