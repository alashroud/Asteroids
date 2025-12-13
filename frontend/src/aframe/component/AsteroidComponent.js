/**
 * AsteroidComponents.js - Asteroid entities with words and destruction mechanics
 * 
 * This file contains two A-Frame components:
 * 1. asteroid - Main asteroid entity with movement, health, and destruction
 * 2. word-billboard - UI component that displays word labels above asteroids
 * 
 * Features:
 * - 3D GLTF model loading with fallback mesh
 * - Word display that follows asteroid and faces camera
 * - Movement toward Earth with collision detection
 * - Highlighting when targeted by typing
 * - Explosion animation on destruction
 * - Health system for future multi-hit mechanics
 * 
 * @component asteroid, word-billboard
 */

// ===========================================
// ASTEROID COMPONENT
// ===========================================

/**
 * Asteroid Component - Destructible space rocks with word labels
 * 
 * Manages:
 * - GLTF model loading with explosion animation
 * - Movement toward Earth at constant velocity
 * - Word display and highlighting
 * - Health and damage system
 * - Destruction sequence with animation
 * - Rotation for visual interest
 * 
 * Asteroids spawn at random positions around Earth and move toward center.
 * User must type the asteroid's word to destroy it before collision.
 * 
 * @component asteroid
 */
AFRAME.registerComponent('asteroid', {
  schema: {
    word: { type: 'string', default: '' },                           // Word to type
    speed: { type: 'number', default: 0.5 },                         // Movement speed (units/sec)
    rotationSpeed: { type: 'vec3', default: { x: 0.5, y: 0.5, z: 0.5 } }, // Rotation speed per axis
    size: { type: 'number', default: 1 },                            // Scale multiplier
    health: { type: 'number', default: 1 },                          // Health points (future use)
    useModel: { type: 'boolean', default: true }                     // Whether to load GLTF model
  },

  /**
   * Initialize asteroid component
   * Sets up model loading, word display, and movement calculations
   */
  init: function() {
    this.targetPosition = { x: 0, y: 0, z: 0 };  // Earth center position
    this.velocity = new THREE.Vector3();         // Movement velocity vector
    this.destroyed = false;                      // Destruction flag
    this.modelLoaded = false;
    this.modelLoadFailed = false;
    this.mixer = null;                           // Animation mixer for GLTF
    this.explosionAction = null;                 // Explosion animation clip
    
    if (this.data.useModel) {
      this.loadModel();
      
      // Fallback timeout if model takes too long
      this.loadTimeout = setTimeout(() => {
        if (!this.modelLoaded && !this.modelLoadFailed) {
          console.warn('Asteroid model timeout, using simple mesh');
          this.modelLoadFailed = true;
          this.createSimpleMesh();
        }
      }, 3000);
    } else {
      this.createSimpleMesh();
    }
    
    this.setupWordDisplay();
    this.calculateVelocity();
    
    console.log('Asteroid created at:', this.el.object3D.position);
  },

  /**
   * Load asteroid 3D model from GLTF file
   * Model includes explosion animation for destruction sequence
   */
  loadModel: function() {
    const modelEl = document.createElement('a-entity');
    
    modelEl.setAttribute('gltf-model', './assets/meteor_explosion/scene.gltf');
    modelEl.setAttribute('scale', `${this.data.size * 0.6} ${this.data.size * 0.6} ${this.data.size * 0.6}`);
    
    modelEl.addEventListener('model-loaded', (e) => {
      console.log('Asteroid model loaded');
      this.onModelLoaded(e);
      clearTimeout(this.loadTimeout);
    });
    
    modelEl.addEventListener('model-error', (e) => {
      console.error('Asteroid model failed to load:', e);
      this.modelLoadFailed = true;
      clearTimeout(this.loadTimeout);
      this.createSimpleMesh();
    });
    
    this.el.appendChild(modelEl);
    this.modelEl = modelEl;
  },

  /**
   * Handle successful model load
   * Sets up materials with emissive glow and prepares explosion animation
   * 
   * @param {Event} e - The model-loaded event
   */
  onModelLoaded: function(e) {
    this.modelLoaded = true;
    const model = this.modelEl.components['gltf-model'].model;
    
    // Add subtle glow to model materials
    if (model) {
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          // Clone material to avoid affecting other instances
          child.material = child.material.clone();
          child.material.emissive = new THREE.Color(0xD3D3D3);
          child.material.emissiveIntensity = 0.3;
        }
      });
    }
    
    // Setup explosion animation
    if (model && model.animations && model.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);
      
      // Find explosion animation clip
      const explosionClip = model.animations.find(clip => 
        clip.name.includes('Take') || 
        clip.name.toLowerCase().includes('explosion')
      ) || model.animations[0];
      
      if (explosionClip) {
        this.explosionAction = this.mixer.clipAction(explosionClip);
        this.explosionAction.setLoop(THREE.LoopOnce);  // Play once then stop
        this.explosionAction.clampWhenFinished = true; // Hold last frame
        this.explosionAction.stop();
        console.log('Explosion animation ready');
      }
    }
  },

  /**
   * Create simple fallback mesh if model fails to load
   * Uses randomized icosahedron to create rocky appearance
   */
  createSimpleMesh: function() {
    // Remove model if it exists
    if (this.modelEl && this.modelEl.parentNode) {
      this.modelEl.parentNode.removeChild(this.modelEl);
      this.modelEl = null;
    }
    
    // Create base icosahedron geometry
    const geometry = new THREE.IcosahedronGeometry(this.data.size, 1);
    
    // Randomize vertices for rocky appearance
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= 1 + Math.random() * 0.3;
      positions[i + 1] *= 1 + Math.random() * 0.3;
      positions[i + 2] *= 1 + Math.random() * 0.3;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Brown rocky material
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D('mesh', mesh);
    
    console.log('Using simple mesh for asteroid');
  },

  /**
   * Create word display UI elements
   * Creates text and background plane that follow asteroid
   * Attached to scene (not asteroid) for independent lifecycle
   */
  setupWordDisplay: function() {
    if (!this.data.word) return;
    
    const scene = this.el.sceneEl;
    
    // Create text element (attached to scene, not asteroid)
    const textEl = document.createElement('a-entity');
    textEl.setAttribute('text', {
      value: this.data.word,
      align: 'center',
      color: '#FFFFFF',
      width: 6,
      wrapCount: 15,
      font: 'roboto'
    });
    textEl.setAttribute('word-billboard', '');
    textEl.setAttribute('class', 'asteroid-word');
    textEl.dataset.asteroidId = this.el.id || `asteroid-${Date.now()}`;
    scene.appendChild(textEl);
    this.wordDisplay = textEl;
    
    // Create background plane (attached to scene, not asteroid)
    const bgEl = document.createElement('a-entity');
    bgEl.setAttribute('geometry', {
      primitive: 'plane',
      width: this.data.word.length * 0.35 + 0.4,
      height: 0.7
    });
    bgEl.setAttribute('material', {
      color: '#000000',
      opacity: 0.75,
      transparent: true
    });
    bgEl.setAttribute('word-billboard', '');
    bgEl.setAttribute('class', 'asteroid-word');
    bgEl.dataset.asteroidId = this.el.id || `asteroid-${Date.now()}`;
    scene.appendChild(bgEl);
    this.wordBackground = bgEl;
    
    // Store vertical offset for word positioning
    this.wordOffset = this.data.size + 1.5;
  },

  /**
   * Calculate velocity vector toward Earth
   * Normalizes direction and multiplies by speed
   */
  calculateVelocity: function() {
    const position = this.el.object3D.position;
    const direction = new THREE.Vector3(
      this.targetPosition.x - position.x,
      this.targetPosition.y - position.y,
      this.targetPosition.z - position.z
    );
    direction.normalize();
    this.velocity = direction.multiplyScalar(this.data.speed);
  },

  /**
   * Update loop (called every frame)
   * Handles movement, rotation, and explosion animation
   * 
   * @param {number} time - Total elapsed time in milliseconds
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  tick: function(time, deltaTime) {
    // Only update explosion animation if destroyed
    if (this.destroyed) {
      if (this.mixer && this.isExploding) {
        this.mixer.update(deltaTime / 1000);
      }
      return;
    }
    
    const dt = deltaTime / 1000;
    const position = this.el.object3D.position;
    
    // Move toward Earth
    position.x += this.velocity.x * dt;
    position.y += this.velocity.y * dt;
    position.z += this.velocity.z * dt;
    
    // Rotate for visual interest
    const rotation = this.el.object3D.rotation;
    rotation.x += this.data.rotationSpeed.x * dt;
    rotation.y += this.data.rotationSpeed.y * dt;
    rotation.z += this.data.rotationSpeed.z * dt;
  },

  /**
   * Update the word displayed on this asteroid
   * Used if asteroid word needs to change dynamically
   * 
   * @param {string} newWord - The new word to display
   */
  updateWord: function(newWord) {
    this.data.word = newWord;
    if (this.wordDisplay) {
      this.wordDisplay.setAttribute('text', 'value', newWord);
    }
    if (this.wordBackground) {
      this.wordBackground.setAttribute('geometry', 'width', newWord.length * 0.35 + 0.4);
    }
  },

  /**
   * Highlight or unhighlight asteroid when targeted
   * Changes word color, background, and model emissive glow
   * Called by GameStateSystem when user types matching letters
   * 
   * @param {boolean} isHighlighted - Whether asteroid should be highlighted
   */
  highlight: function(isHighlighted) {
    // Highlight word text
    if (this.wordDisplay) {
      if (isHighlighted) {
        this.wordDisplay.setAttribute('text', 'color', '#00FF00');
        this.wordDisplay.setAttribute('animation', {
          property: 'scale',
          to: '1.2 1.2 1.2',
          dur: 200,
          easing: 'easeOutQuad'
        });
      } else {
        this.wordDisplay.setAttribute('text', 'color', '#FFFFFF');
        this.wordDisplay.setAttribute('scale', '1 1 1');
      }
    }
    
    // Highlight word background
    if (this.wordBackground) {
      if (isHighlighted) {
        this.wordBackground.setAttribute('material', 'color', '#003300');
        this.wordBackground.setAttribute('material', 'opacity', '0.9');
      } else {
        this.wordBackground.setAttribute('material', 'color', '#000000');
        this.wordBackground.setAttribute('material', 'opacity', '0.75');
      }
    }
    
    // Highlight 3D model with green glow
    if (this.modelEl && this.modelLoaded) {
      const model = this.modelEl.getObject3D('mesh');
      if (model) {
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            if (isHighlighted) {
              // Store original emissive values
              if (!child.material.userData.originalEmissive) {
                child.material.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
                child.material.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;
              }
              
              // Apply green glow
              child.material.emissive = new THREE.Color(0x00FF00);
              child.material.emissiveIntensity = 0.5;
            } else {
              // Restore original emissive values
              if (child.material.userData.originalEmissive) {
                child.material.emissive.copy(child.material.userData.originalEmissive);
                child.material.emissiveIntensity = child.material.userData.originalEmissiveIntensity;
              }
            }
          }
        });
      }
    }
  },

  /**
   * Apply damage to asteroid
   * Reduces health and destroys if health reaches zero
   * (Currently health is always 1, but supports future multi-hit mechanics)
   * 
   * @param {number} damage - Amount of damage to apply (default: 1)
   * @returns {boolean} True if asteroid was destroyed, false otherwise
   */
  takeDamage: function(damage = 1) {
    this.data.health -= damage;
    
    if (this.data.health <= 0) {
      this.destroy();
      return true;
    }
    return false;
  },

  /**
   * Destroy asteroid with explosion effect
   * Plays explosion animation if available, otherwise scales down
   * Hides word display and emits destruction event
   * 
   * @param {boolean} wasTyped - Whether asteroid was destroyed by typing (true) or collision (false)
   */
  destroy: function(wasTyped = false) {
    this.destroyed = true;
    this.isExploding = true;
    
    console.log('Destroying asteroid:', this.data.word, wasTyped ? '(typed)' : '(collision)');
    
    // Hide word display immediately
    if (this.wordDisplay) this.wordDisplay.setAttribute('visible', false);
    if (this.wordBackground) this.wordBackground.setAttribute('visible', false);
    
    // Play explosion animation if available
    if (this.explosionAction && this.modelLoaded) {
      console.log('Playing explosion animation');
      this.explosionAction.reset();
      this.explosionAction.play();
      
      const duration = this.explosionAction.getClip().duration * 1000;
      
      // Remove after animation completes
      setTimeout(() => {
        this.remove();
      }, 1000);
    } else {
      // Fallback scale-down animation
      this.el.setAttribute('animation', {
        property: 'scale',
        to: '0.1 0.1 0.1',
        dur: 500,
        easing: 'easeInQuad'
      });
      setTimeout(() => {
        this.remove();
      }, 1000);
    }
    
    // Emit event for scoring and game logic
    this.el.emit('asteroid-destroyed', { 
      asteroid: this.el,
      word: this.data.word,
      typed: wasTyped
    });
  },

  /**
   * Remove asteroid entity from scene
   * Called after destruction animation completes
   */
  remove: function() {
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
});


// ===========================================
// WORD BILLBOARD COMPONENT
// ===========================================

/**
 * Word Billboard Component - Makes word labels follow asteroids and face camera
 * 
 * Manages:
 * - Finding parent asteroid by ID or reference
 * - Positioning word above asteroid
 * - Scaling word based on distance (keeps readable at any distance)
 * - Rotating word to always face camera
 * 
 * This component is attached to word text and background elements,
 * not to the asteroid itself, allowing independent lifecycle management.
 * 
 * @component word-billboard
 */
AFRAME.registerComponent('word-billboard', {
  
  /**
   * Initialize billboard component
   * Sets up references that will be populated on first tick
   */
  init: function() {
    this.camera = null;      // Camera reference (found on first tick)
    this.asteroid = null;    // Parent asteroid reference
    this.offsetY = 0;        // Vertical offset above asteroid
    this.baseScale = 1;      // Base scale multiplier
  },

  /**
   * Update loop (called every frame)
   * Positions word above asteroid, scales with distance, and faces camera
   */
  tick: function() {
    // Get camera reference on first frame
    if (!this.camera) {
      this.camera = document.querySelector('[camera]');
      if (!this.camera) return;
    }
    
    // Find parent asteroid if not set
    if (!this.asteroid) {
      const asteroidId = this.el.dataset.asteroidId;
      const asteroids = document.querySelectorAll('[asteroid]');
      
      for (const ast of asteroids) {
        // Match by ID
        const id = ast.id || `asteroid-${ast.components.asteroid.el.object3D.uuid}`;
        if (id === asteroidId) {
          this.asteroid = ast;
          if (ast.components.asteroid) {
            this.offsetY = ast.components.asteroid.wordOffset || 2.5;
          }
          break;
        }
        
        // Fallback: match by checking if word display matches
        if (ast.components.asteroid && 
            (ast.components.asteroid.wordDisplay === this.el ||
             ast.components.asteroid.wordBackground === this.el)) {
          this.asteroid = ast;
          this.offsetY = ast.components.asteroid.wordOffset || 2.5;
          break;
        }
      }
    }
    
    // Update position to follow asteroid
    if (this.asteroid) {
      const asteroidPos = new THREE.Vector3();
      this.asteroid.object3D.getWorldPosition(asteroidPos);
      
      // Position above asteroid
      this.el.object3D.position.set(
        asteroidPos.x,
        asteroidPos.y + this.offsetY,
        asteroidPos.z
      );
      
      // Scale based on distance to camera (keeps text readable)
      const cameraPos = new THREE.Vector3();
      this.camera.object3D.getWorldPosition(cameraPos);
      const distance = cameraPos.distanceTo(asteroidPos);
      
      // Scale increases with distance
      // Minimum scale of 1, increases by 0.05 per unit distance beyond 15 units
      const scale = Math.max(1, 1 + (distance - 15) * 0.05);
      this.el.object3D.scale.set(scale, scale, scale);
    }
    
    // Always look at camera for readability
    const cameraPos = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(cameraPos);
    this.el.object3D.lookAt(cameraPos);
  }
});
