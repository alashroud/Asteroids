import TypingEngine from '../../game/TypingEngine.js';
import GameEngine from '../../game/GameEngine.js';

AFRAME.registerComponent('asteroid-component', {
  schema: {
    word: { type: 'string', default: 'ERROR' },
    speed: { type: 'number', default: 2.0 },
    damage: { type: 'number', default: 10 },
    size: { type: 'number', default: 0.7 },
    rotationSpeed: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
    useModel: { type: 'boolean', default: false }
  },

  init: function() {
    // --- 1. Create a Child Entity for the Visual Model ---
    this.modelEl = document.createElement('a-entity');
    
    if (this.data.useModel) {
      this.modelEl.setAttribute('gltf-model', '#asteroid-model');
      this.modelEl.setAttribute('scale', '0.5 0.5 0.5');
    } else {
      // Fallback geometry
      this.modelEl.setAttribute('geometry', 'primitive: dodecahedron; radius: 0.5');
      this.modelEl.setAttribute('material', 'color: #888; roughness: 1.0; flatShading: true');
    }
    
    this.el.appendChild(this.modelEl);

    // --- 2. Create the Text Label ---
    this.textEl = document.createElement('a-text');
    this.textEl.setAttribute('value', this.data.word);
    this.textEl.setAttribute('align', 'center');
    
    
    this.textEl.setAttribute('position', '0 10 0'); 
    
    
    this.textEl.setAttribute('width', '10'); 
    
    // Ensure it renders on both sides just in case
    this.textEl.setAttribute('side', 'double');
    
    // Make text always face the camera
    this.textEl.setAttribute('look-at', '[camera]'); 
    
    this.el.appendChild(this.textEl);

    // --- 3. Setup Rotation Variables ---
    this.rotationAxis = {
      x: Math.random() * this.data.rotationSpeed.x,
      y: Math.random() * this.data.rotationSpeed.y,
      z: Math.random() * this.data.rotationSpeed.z
    };
    this.destroyed = false;
  },
  
  update: function(oldData) {
    // Reset destroyed state when data changes (e.g., respawn)
    this.destroyed = false;
    // Update displayed word
    if (this.textEl) {
      this.textEl.setAttribute('value', this.data.word);
      this.textEl.setAttribute('color', '#ffffff');
    }
    // Reset rotation randomness for visual variation
    this.rotationAxis = {
      x: Math.random() * this.data.rotationSpeed.x,
      y: Math.random() * this.data.rotationSpeed.y,
      z: Math.random() * this.data.rotationSpeed.z
    };
    // Ensure entity is visible
    this.el.setAttribute('visible', true);
  },

  tick: function(time, delta) {
    if (window.__GAME_PAUSED__ === true) return;
    if (!delta) return;

    const moveAmount = (this.data.speed * delta) / 1000;
    
    // Check collision BEFORE moving to prevent fast asteroids from passing through
    const pos = this.el.object3D.position.clone();
    const distanceToCenter = pos.length();
    
    const shieldEl = document.getElementById('shield');
    const earthEl = document.getElementById('earth');
    
    // Respect global shield destruction from collision system and shield component state
    const collisionSystem = this.el.sceneEl && this.el.sceneEl.systems && this.el.sceneEl.systems.collision;
    const shieldIsGone = !shieldEl || !shieldEl.components.shield || shieldEl.components.shield.destroyed || (collisionSystem && collisionSystem.shieldDestroyed);
    
    // Check shield collision first (before moving)
    if (!shieldIsGone && shieldEl && shieldEl.components.shield) {
      const shieldRadius = shieldEl.components.shield.data.radius;
      // Add safety margin (moveAmount) to catch fast-moving asteroids
      if (distanceToCenter <= shieldRadius + this.data.size + moveAmount) {
        shieldEl.components.shield.takeDamage(this.data.damage);
        this.destroy(false);
        return;
      }
    }
    
    // Check earth collision (before moving)
    if (earthEl && earthEl.components.earth) {
      const earthRadius = earthEl.components.earth.data.radius;
      // Add safety margin (moveAmount) to catch fast-moving asteroids
      if (distanceToCenter <= earthRadius + this.data.size + moveAmount) {
        earthEl.components.earth.takeDamage(this.data.damage);
        this.destroy(false);
        return;
      }
    }
    
    // Only move if no collision detected
    this.el.object3D.position.z += moveAmount;

    // Cleanup: Remove asteroid if it has passed Earth (to prevent memory leaks)
    // Earth is at origin (0,0,0), so if asteroid is past Earth and far enough away, remove it
    const newPos = this.el.object3D.position;
    const newDistanceToCenter = newPos.length();
    
    // If asteroid has passed Earth (z > 0) and is beyond Earth's radius + safety margin, damage Earth and remove it
    if (newPos.z > 10 && newDistanceToCenter > 15) {
      // Asteroid has passed Earth without being destroyed - apply damage to Earth
      // Check if shield is still active (if shield exists and isn't destroyed, it should have been hit already)
      const shieldEl = document.getElementById('shield');
      const shieldIsGone = !shieldEl || !shieldEl.components.shield || shieldEl.components.shield.destroyed || 
                          (collisionSystem && collisionSystem.shieldDestroyed);
      
      // Only damage Earth if shield is gone (shield should have absorbed the hit if it was active)
      // If shield was active, this asteroid somehow bypassed it, so still damage Earth
      const earthEl = document.getElementById('earth');
      if (earthEl && earthEl.components.earth) {
        // Apply damage to Earth (same damage as if it had collided)
        earthEl.components.earth.takeDamage(this.data.damage);
        console.log(`Asteroid passed Earth! Earth took ${this.data.damage} damage.`);
      }
      // Remove asteroid after applying damage
      this.removeSelf();
      return;
    }

    if (this.modelEl) {
      this.modelEl.object3D.rotation.x += this.rotationAxis.x * (delta / 1000);
      this.modelEl.object3D.rotation.y += this.rotationAxis.y * (delta / 1000);
      this.modelEl.object3D.rotation.z += this.rotationAxis.z * (delta / 1000);
    }

    // Dynamically scale word text AND model for readability/visibility
    if (this.el.sceneEl && this.el.sceneEl.camera) {
      const camEl = this.el.sceneEl.camera.el;
      if (camEl) {
        const asteroidPos = new THREE.Vector3();
        const cameraPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(asteroidPos);
        camEl.object3D.getWorldPosition(cameraPos);
        const distance = cameraPos.distanceTo(asteroidPos);
        
        // 1. Text Scaling (Keep existing logic but tuned)
        const minDist = 10;
        const maxDist = 80;
        
        // Text Scale
        if (this.textEl) {
          const minTextScale = 1.5;
          const maxTextScale = 6.0; // Larger text at distance
          const t = Math.max(0, Math.min(1, (distance - minDist) / (maxDist - minDist)));
          const textScale = minTextScale + (maxTextScale - minTextScale) * t;
          this.textEl.object3D.scale.set(textScale, textScale, textScale);
        }

        // 2. Model Scaling 
        if (this.modelEl) {
          const baseScale = 0.45;
          const farScale = 0.9;
          
          // Use a different curve for model to keep it impressive from afar but shrinking as it approaches
          const tModel = Math.max(0, Math.min(1, (distance - 20) / (maxDist - 20)));
          const modelScale = baseScale + (farScale - baseScale) * tModel;
          this.modelEl.object3D.scale.set(modelScale, modelScale, modelScale);
          
          // Keep word label above the asteroid top based on current scale
          if (this.textEl) {
            const textY = modelScale * 2.2;
            this.textEl.object3D.position.set(0, textY, 0);
          }
        }
      }
    }
  },

  destroy: function(typed) {
    if (this.destroyed) return;
    this.destroyed = true;

    // Spawn explosion effect at asteroid position
    const scene = this.el.sceneEl;
    if (scene) {
      const explosion = document.createElement('a-entity');
      const worldPos = new THREE.Vector3();
      this.el.object3D.getWorldPosition(worldPos);
      explosion.setAttribute('gltf-model', '/assets/meteor_explosion/scene.gltf');      explosion.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
      
      // Scale explosion appropriately (was 0.35, made slightly larger for visibility)
      explosion.setAttribute('scale', '0.2 0.2 0.2');
      
      
      explosion.setAttribute('animation-mixer', 'clip: *; loop: once; clampWhenFinished: true');
      
      scene.appendChild(explosion);
      
      // Remove explosion after animation completes (or a safe fallback time)
      const cleanup = () => {
        if (explosion && explosion.parentNode) {
          explosion.parentNode.removeChild(explosion);
          // Dispose Three.js resources if available
          const obj3D = explosion.getObject3D('mesh');
          if (obj3D) {
            // Dispose geometries and materials to free memory
            obj3D.traverse((child) => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    if (mat.map) mat.map.dispose();
                    mat.dispose();
                  });
                } else {
                  if (child.material.map) child.material.map.dispose();
                  child.material.dispose();
                }
              }
            });
          }
        }
      };
      
      // Listen for animation finish
      explosion.addEventListener('animation-finished', cleanup);
      
      // Fallback cleanup in case animation event misses or is too long
      setTimeout(cleanup, 200);
    }

    // Clean up asteroid's Three.js resources before removal
    this._disposeResources();

    // Ensure TypingEngine forgets this target
    TypingEngine.removeTarget(this.el.id);
    // Notify scene for scoring and effects
    this.el.sceneEl && this.el.sceneEl.emit('asteroid-destroyed', { asteroid: this.el, typed: !!typed });
    // Remove entity from DOM to guarantee it never reappears
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  },

  removeSelf: function() {
    // Clean up resources before removal
    this._disposeResources();
    
    // Ensure TypingEngine forgets this target
    TypingEngine.removeTarget(this.el.id);
    
    // Notify scene that asteroid was removed (for collision system cleanup)
    this.el.sceneEl && this.el.sceneEl.emit('asteroid-destroyed', { asteroid: this.el, typed: false });
    
    // Remove from DOM
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  },

  _disposeResources: function() {
    if (this.destroyed) return; // Prevent double disposal
    
    // Dispose model resources
    if (this.modelEl) {
      const obj3D = this.modelEl.getObject3D('mesh');
      if (obj3D) {
        obj3D.traverse((child) => {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                if (mat.map) mat.map.dispose();
                if (mat.normalMap) mat.normalMap.dispose();
                if (mat.emissiveMap) mat.emissiveMap.dispose();
                mat.dispose();
              });
            } else {
              if (child.material.map) child.material.map.dispose();
              if (child.material.normalMap) child.material.normalMap.dispose();
              if (child.material.emissiveMap) child.material.emissiveMap.dispose();
              child.material.dispose();
            }
          }
        });
      }
    }
    
    // Dispose text resources
    if (this.textEl) {
      const textObj3D = this.textEl.getObject3D('mesh');
      if (textObj3D) {
        if (textObj3D.geometry) textObj3D.geometry.dispose();
        if (textObj3D.material) {
          if (textObj3D.material.map) textObj3D.material.map.dispose();
          textObj3D.material.dispose();
        }
      }
    }
  },

  highlight: function(enabled) {
    const text = this.textEl;
    if (text) {
      text.setAttribute('color', enabled ? '#ff4444' : '#ffffff');
    }
  }
});
