AFRAME.registerComponent('earth', {
  schema: {
    radius: { type: 'number', default: 2 },
    health: { type: 'number', default: 100 }
  },

  
  init: function() {
    this.maxHealth = this.data.health;
    this.mixer = null;                // Animation mixer for GLTF animations
    this.cloudAnimation = null;       // Cloud layer animation
    this.modelLoaded = false;
    this.modelLoadFailed = false;
    
    this.loadModel();
    this.setupHealthBar();
    this._shieldDestroyed = false;
    
    // Fallback timeout if model takes too long
    this.loadTimeout = setTimeout(() => {
      if (!this.modelLoaded && !this.modelLoadFailed) {
        console.warn('Earth model timeout, using fallback sphere');
        this.createFallbackSphere();
      }
    }, 3000);
  },

  loadModel: function() {
    const modelEl = document.createElement('a-entity');
    modelEl.setAttribute('gltf-model', '/assets/earth/scene.gltf');
    modelEl.setAttribute('scale', `${this.data.radius} ${this.data.radius} ${this.data.radius}`);
    modelEl.setAttribute('rotation', '0 0 0');
    
    modelEl.addEventListener('model-loaded', (e) => {
      console.log('Earth model loaded');
      this.onModelLoaded(e);
      clearTimeout(this.loadTimeout);
    });
    
    modelEl.addEventListener('model-error', (e) => {
      console.error('Earth model failed to load');
      this.modelLoadFailed = true;
      clearTimeout(this.loadTimeout);
      this.createFallbackSphere();
    });
    
    this.el.appendChild(modelEl);
    this.modelEl = modelEl;
  },


  createFallbackSphere: function() {
    if (this.modelEl && this.modelEl.parentNode) {
      this.modelEl.parentNode.removeChild(this.modelEl);
    }
    
    const sphere = document.createElement('a-entity');
    sphere.setAttribute('geometry', {
      primitive: 'sphere',
      radius: this.data.radius
    });
    sphere.setAttribute('material', {
      color: '#2233FF',
      roughness: 0.7,
      metalness: 0.3
    });
    
    this.el.appendChild(sphere);
    this.fallbackSphere = sphere;
    this.earthRotationSpeed = 0.05;
    
    console.log('Using fallback sphere for Earth');
  },


  onModelLoaded: function(e) {
    this.modelLoaded = true;
    const model = this.modelEl.components['gltf-model'].model;
    
    if (model && model.animations && model.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);
      
      // Find rotation/spin animation
      const spinClip = model.animations.find(clip => 
        clip.name.toLowerCase().includes('spin') ||
        clip.name.toLowerCase().includes('rotation') ||
        clip.name.toLowerCase().includes('take')
      ) || model.animations[0];
      
      if (spinClip) {
        const spinAction = this.mixer.clipAction(spinClip);
        spinAction.setLoop(THREE.LoopRepeat);
        spinAction.play();
        console.log('Earth animation playing:', spinClip.name);
      }
      
      // Also handle cloud animation if it exists
      this.cloudAnimation = model.animations.find(clip =>
        clip.name.toLowerCase().includes('cloud')
      );
      
      if (this.cloudAnimation) {
        const cloudAction = this.mixer.clipAction(this.cloudAnimation);
        cloudAction.setLoop(THREE.LoopRepeat);
        cloudAction.play();
        console.log('Cloud animation playing');
      }
    }
  },


  setupHealthBar: function() {
    const scene = this.el.sceneEl;
    
    // Health bar background (dark background)
    const barBg = document.createElement('a-entity');
    barBg.setAttribute('geometry', {
      primitive: 'box',
      width: 6,
      height: 0.7,
      depth: 0.3
    });
    barBg.setAttribute('material', {
      color: '#222222',
      opacity: 0.85,
      transparent: true
    });
    barBg.setAttribute('health-bar-billboard', `target: #earth; offsetY: 7.5`);
    barBg.setAttribute('visible', 'false');
    scene.appendChild(barBg);
    this.healthBarBg = barBg;
    
    // Health bar (colored bar showing health level)
    const healthBar = document.createElement('a-entity');
    healthBar.setAttribute('id', 'earth-health-bar');
    healthBar.setAttribute('geometry', {
      primitive: 'box',
      width: 5.8,
      height: 0.6,
      depth: 0.32
    });
    healthBar.setAttribute('material', {
      color: '#00FF00',
      shader: 'flat'
    });
    healthBar.setAttribute('health-bar-billboard', `target: #earth; offsetY: 7.5`);
    healthBar.setAttribute('visible', 'false');
    scene.appendChild(healthBar);
    this.healthBar = healthBar;
    
    // Health text (displays percentage and status)
    const healthText = document.createElement('a-entity');
    healthText.setAttribute('id', 'earth-health-text');
    healthText.setAttribute('text', {
      value: `EARTH: ${this.data.health}%`,
      align: 'center',
      color: '#FFFFFF',
      width: 20,
      font: 'roboto'
    });
    healthText.setAttribute('health-bar-billboard', `target: #earth; offsetY: 8.3`);
    healthText.setAttribute('visible', 'false');
    scene.appendChild(healthText);
    this.healthText = healthText;
    
    this.wordOffset = this.data.size + 1.5;
  },


  showHealthBar: function() {
    console.log('Showing Earth health bar');
    if (this.healthBarBg) this.healthBarBg.setAttribute('visible', 'true');
    if (this.healthBar) this.healthBar.setAttribute('visible', 'true');
    if (this.healthText) this.healthText.setAttribute('visible', 'true');
    this.updateHealthBar();
  },

  tick: function(time, deltaTime) {
    if (window.__GAME_PAUSED__ === true) return;
    const dt = deltaTime / 1000;
    
    // Update animation mixer for GLTF animations
    if (this.mixer) {
      this.mixer.update(dt);
    }
    
    // Rotate Earth (for fallback sphere or additional rotation)
    if ((this.modelLoaded || this.fallbackSphere) && this.earthRotationSpeed) {
      this.el.object3D.rotation.y += this.earthRotationSpeed * dt;
    }
  },

 
  takeDamage: function(damage) {
    this.data.health = Math.max(0, this.data.health - damage);
    this.updateHealthBar();
    this.flashDamage();
    
    console.log(`Earth Health: ${this.data.health}/${this.maxHealth}`);
    
    // Emit event for other systems (scoring, audio, etc.)
    this.el.emit('earth-damaged', { 
      health: this.data.health,
      damage: damage,
      percentage: (this.data.health / this.maxHealth) * 100
    });
    
    // Check for game over
    if (this.data.health <= 0) {
      console.log('EARTH DESTROYED - GAME OVER!');
      this.el.emit('earth-destroyed');
    }
  },


  flashDamage: function() {
    if (this.modelEl && this.modelLoaded) {
      const model = this.modelEl.getObject3D('mesh');
      if (model) {
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
            const originalIntensity = child.material.emissiveIntensity || 0;
            
            // Flash red
            if (child.material.emissive) {
              child.material.emissive.setHex(0xFF0000);
              child.material.emissiveIntensity = 1.0; // Increased intensity for clearer flash
            }
            
            // Restore original after 100ms (Quick flash)
            setTimeout(() => {
              if (child.material && child.material.emissive) {
                child.material.emissive.copy(originalEmissive);
                child.material.emissiveIntensity = originalIntensity;
              }
            }, 100);
          }
        });
      }
    } else if (this.fallbackSphere) {
      // Flash fallback sphere red
      const originalColor = this.fallbackSphere.getAttribute('material').color;
      this.fallbackSphere.setAttribute('material', 'color', '#FF0000');
      setTimeout(() => {
        this.fallbackSphere.setAttribute('material', 'color', originalColor);
      }, 200);
    }
  },


  updateHealthBar: function() {
    if (!this.healthBar || !this.healthText) return;
    
    const healthPercent = this.data.health / this.maxHealth;
    
    // Scale bar width based on health percentage
    const scale = { x: healthPercent, y: 1, z: 1 };
    this.healthBar.setAttribute('scale', scale);
    
    // Shift bar left as it depletes
    const offset = (1 - healthPercent) * -2;
    this.healthBar.object3D.position.x = offset;
    
    // Determine color and status based on health percentage
    let color = '#00FF00';
    let status = 'STABLE';
    
    if (healthPercent < 0.2) {
      color = '#FF0000';
      status = 'CRITICAL';
    } else if (healthPercent < 0.4) {
      color = '#FF3300';
      status = 'DANGER';
    } else if (healthPercent < 0.6) {
      color = '#FF6600';
      status = 'WARNING';
    } else if (healthPercent < 0.8) {
      color = '#FFAA00';
      status = 'CAUTION';
    }
    
    this.healthBar.setAttribute('material', 'color', color);
    
    const healthValue = Math.round(this.data.health);
    this.healthText.setAttribute('text', 'value', `EARTH: ${healthValue}% [${status}]`);
    this.healthText.setAttribute('text', 'color', color);
  },


  heal: function(amount) {
    this.data.health = Math.min(this.maxHealth, this.data.health + amount);
    this.updateHealthBar();
    this.el.emit('earth-healed', { health: this.data.health, amount: amount });
  }
});



AFRAME.registerComponent('shield', {
  schema: {
    radius: { type: 'number', default: 3.5 },
    strength: { type: 'number', default: 50 },
    maxStrength: { type: 'number', default: 50 }
  },

  /**
   * Initialize shield component
   * Creates shield mesh, glow effect, and health bar
   */
  init: function() {
    console.log('Shield component initializing...');
    this.destroyed = false;
    this.createShieldMesh();
    this.createHealthBar();
    this.pulseTime = 0;      // Time tracker for pulse animation
    this.hitFlash = false;   // Flag for hit flash effect
    console.log('Shield initialized successfully');
  },

  createShieldMesh: function() {
    // Main wireframe shield
    const geometry = new THREE.IcosahedronGeometry(this.data.radius, 2);
    
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
      wireframeLinewidth: 2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D('mesh', mesh);
    
    // Inner glow mesh
    const glowGeometry = new THREE.IcosahedronGeometry(this.data.radius * 0.98, 2);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glowMesh);
    this.glowMesh = glowMesh;
    
    console.log('Shield mesh created and visible');
  },

 
  createHealthBar: function() {
    const scene = this.el.sceneEl;
    
    // Health bar background
    const barBg = document.createElement('a-entity');
    barBg.setAttribute('geometry', {
      primitive: 'box',
      width: 6,
      height: 0.7,
      depth: 0.3
    });
    barBg.setAttribute('material', {
      color: '#222222',
      opacity: 0.85,
      transparent: true
    });
    barBg.setAttribute('health-bar-billboard', `target: #shield; offsetY: 8.5`);
    scene.appendChild(barBg);
    this.healthBarBg = barBg;
    
    // Health bar
    const healthBar = document.createElement('a-entity');
    healthBar.setAttribute('id', 'shield-health-bar');
    healthBar.setAttribute('geometry', {
      primitive: 'box',
      width: 5.8,
      height: 0.6,
      depth: 0.32
    });
    healthBar.setAttribute('material', {
      color: '#00FFFF',
      shader: 'flat'
    });
    healthBar.setAttribute('health-bar-billboard', `target: #shield; offsetY: 8.5`);
    scene.appendChild(healthBar);
    this.healthBar = healthBar;
    
    // Health text
    const healthText = document.createElement('a-entity');
    healthText.setAttribute('id', 'shield-health-text');
    healthText.setAttribute('text', {
      value: `SHIELD: ${this.data.strength}/${this.data.maxStrength}`,
      align: 'center',
      color: '#00FFFF',
      width: 20,
      font: 'roboto'
    });
    healthText.setAttribute('health-bar-billboard', `target: #shield; offsetY: 9.2`);
    scene.appendChild(healthText);
    this.healthText = healthText;
    
    console.log('Shield health bar created');
  },


  tick: function(time, deltaTime) {
    const dt = deltaTime / 1000;
    
    // Pulsing animation (subtle breathing effect)
    this.pulseTime += dt * 2;
    const pulse = 1 + Math.sin(this.pulseTime) * 0.03;
    
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.scale.set(pulse, pulse, pulse);
    }
    
    // Continuous rotation on two axes
    this.el.object3D.rotation.y += dt * 0.2;
    this.el.object3D.rotation.x += dt * 0.1;
    
    // Fade out hit flash effect
    if (this.hitFlash) {
      const material = this.el.getObject3D('mesh').material;
      if (material) {
        material.opacity = Math.max(0.3, material.opacity - dt * 2);
        if (material.opacity <= 0.3) {
          this.hitFlash = false;
        }
      }
    }
  },


  pulse: function() {
    this.hitFlash = true;
    const mesh = this.el.getObject3D('mesh');
    if (mesh && mesh.material) {
      mesh.material.opacity = 0.8;
      mesh.material.color.setHex(0xFFFF00); // Flash yellow
      
      // Return to cyan after brief delay
      setTimeout(() => {
        if (mesh && mesh.material) {
          mesh.material.color.setHex(0x00FFFF);
        }
      }, 150);
    }
  },


  takeDamage: function(damage) {
    if (this.destroyed) {
      return true;
    }
    this.data.strength = Math.max(0, this.data.strength - damage);
    this.pulse();
    
    console.log(`Shield damaged: ${this.data.strength}/${this.data.maxStrength}`);
    
    this.updateHealthBar();
    
    // Emit event for other systems
    this.el.emit('shield-damaged', { 
      strength: this.data.strength,
      damage: damage,
      percentage: (this.data.strength / this.data.maxStrength) * 100
    });
    
    // Change shield color based on health
    const mesh = this.el.getObject3D('mesh');
    if (mesh && mesh.material) {
      const strengthPercent = this.data.strength / this.data.maxStrength;
      mesh.material.opacity = 0.2 + (strengthPercent * 0.4);
      
      if (strengthPercent < 0.3) {
        mesh.material.color.setHex(0xFF0000); // Red when critical
      } else if (strengthPercent < 0.6) {
        mesh.material.color.setHex(0xFFAA00); // Orange when damaged
      } else {
        mesh.material.color.setHex(0x00FFFF); // Cyan when healthy
      }
    }
    
    // Destroy shield if strength depleted
    if (this.data.strength <= 0) {
      this.destroy();
      return true;
    }
    return false;
  },


  updateHealthBar: function() {
    if (!this.healthBar || !this.healthText) return;
    
    const healthPercent = this.data.strength / this.data.maxStrength;
    
    // Scale and position bar
    const scale = { x: healthPercent, y: 1, z: 1 };
    this.healthBar.setAttribute('scale', scale);
    
    const offset = (1 - healthPercent) * -2;
    this.healthBar.object3D.position.x = offset;
    
    // Determine color based on health
    let color = '#00FFFF';
    if (healthPercent < 0.3) {
      color = '#FF0000';
    } else if (healthPercent < 0.6) {
      color = '#FFAA00';
    }
    
    this.healthBar.setAttribute('material', 'color', color);
    this.healthText.setAttribute('text', 'value', `SHIELD: ${this.data.strength}/${this.data.maxStrength}`);
    this.healthText.setAttribute('text', 'color', color);
  },


  destroy: function() {
    if (this.destroyed) return;
    this.destroyed = true;
    console.log('SHIELD DESTROYED!');
    this.el.emit('shield-destroyed');
    
    // Hide shield mesh immediately
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.visible = false;
    }
    
    // Remove health bars from DOM immediately
    if (this.healthBarBg && this.healthBarBg.parentNode) {
      this.healthBarBg.parentNode.removeChild(this.healthBarBg);
    }
    if (this.healthBar && this.healthBar.parentNode) {
      this.healthBar.parentNode.removeChild(this.healthBar);
    }
    if (this.healthText && this.healthText.parentNode) {
      this.healthText.parentNode.removeChild(this.healthText);
    }
    
    // Create explosion effect
    this.createExplosion();
    
    // Show Earth health bar immediately
    const earth = document.querySelector('#earth');
    if (earth && earth.components.earth) {
      earth.components.earth.showHealthBar();
    }
    
    // Remove shield entity after explosion
    setTimeout(() => {
      if (this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    }, 400);
  },


  createExplosion: function() {
    const group = document.createElement('a-entity');
    group.setAttribute('position', '0 0 0');
    this.el.sceneEl.appendChild(group);
    
    const flash = document.createElement('a-entity');
    flash.setAttribute('geometry', { primitive: 'sphere', radius: this.data.radius * 1.2 });
    flash.setAttribute('material', { color: '#FFFFFF', shader: 'flat', transparent: true, opacity: 0.9 });
    flash.setAttribute('animation', { property: 'scale', from: '0.6 0.6 0.6', to: '2 2 2', dur: 180, easing: 'easeOutQuad' });
    flash.setAttribute('animation__opacity', { property: 'components.material.material.opacity', from: 0.9, to: 0, dur: 180, easing: 'linear' });
    group.appendChild(flash);
    
    const ring = document.createElement('a-entity');
    ring.setAttribute('geometry', { primitive: 'ring', radiusInner: this.data.radius * 0.9, radiusOuter: this.data.radius });
    ring.setAttribute('material', { color: '#00FFFF', shader: 'flat', transparent: true, opacity: 0.7 });
    ring.setAttribute('rotation', '-90 0 0');
    ring.setAttribute('animation', { property: 'scale', from: '1 1 1', to: '2.2 2.2 2.2', dur: 380, easing: 'easeOutQuad' });
    ring.setAttribute('animation__opacity', { property: 'components.material.material.opacity', from: 0.7, to: 0, dur: 380, easing: 'linear' });
    group.appendChild(ring);
    
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('a-entity');
      const size = 0.08 + Math.random() * 0.18;
      particle.setAttribute('geometry', { primitive: 'sphere', radius: size });
      const colorChoice = Math.random();
      let color = '#FFFFFF';
      if (colorChoice < 0.33) color = '#00FFFF';
      else if (colorChoice < 0.66) color = '#AAFFFF';
      particle.setAttribute('material', { color, shader: 'flat', transparent: true, opacity: 1 });
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const elevation = (Math.random() - 0.5) * (Math.PI * 0.6);
      const speed = 1.6 + Math.random() * 1.4;
      const x = Math.cos(angle) * Math.cos(elevation) * this.data.radius;
      const y = Math.sin(elevation) * this.data.radius;
      const z = Math.sin(angle) * Math.cos(elevation) * this.data.radius;
      particle.setAttribute('position', `${x} ${y} ${z}`);
      const dur = 350 + Math.random() * 200;
      particle.setAttribute('animation', { property: 'position', to: `${x * speed} ${y * speed} ${z * speed}`, dur, easing: 'easeOutQuad' });
      particle.setAttribute('animation__opacity', { property: 'components.material.material.opacity', from: 1, to: 0, dur, easing: 'easeInQuad' });
      group.appendChild(particle);
    }
    
    setTimeout(() => {
      if (group && group.parentNode) group.parentNode.removeChild(group);
    }, 450);
  }
});



AFRAME.registerComponent('health-bar-billboard', {
  schema: {
    target: { type: 'selector', default: null },  // Target entity to follow
    offsetY: { type: 'number', default: 2.5 }     // Height offset above target
  },


  init: function() {
    this.camera = null;
    this.target = null;
    
    // Get target element from selector
    if (this.data.target) {
      this.target = this.data.target;
    }
  },


  tick: function() {
    // Get camera reference on first frame
    if (!this.camera) {
      this.camera = document.querySelector('[camera]');
      if (!this.camera) return;
    }
    
    // Position health bar above target, centered at origin
    if (this.target) {
      const targetPos = new THREE.Vector3();
      this.target.object3D.getWorldPosition(targetPos);
      
      // Keep X and Z at center (0,0), only update Y to be above target
      this.el.object3D.position.set(
        0,  // Always centered on X axis
        targetPos.y + this.data.offsetY,  // Above target
        0   // Always centered on Z axis
      );
    }
    
    // Always look at camera for readability
    const cameraPos = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(cameraPos);
    this.el.object3D.lookAt(cameraPos);
  }
});
