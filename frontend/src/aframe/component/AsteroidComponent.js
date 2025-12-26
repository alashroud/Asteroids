/* global AFRAME */
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
    // We do this so we can spin the rock independently of the text
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
    
    // Position text ABOVE the asteroid so it's not inside
    this.textEl.setAttribute('position', '0 10 0'); 
    
    // Make it large enough to read
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
    this.el.object3D.position.z += moveAmount;

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

        // 2. Model Scaling (tuned: readable but not oversized)
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

    const pos = this.el.object3D.position.clone();
    const distanceToCenter = pos.length();

    const shieldEl = document.getElementById('shield');
    const earthEl = document.getElementById('earth');

    // Respect global shield destruction from collision system and shield component state
    const collisionSystem = this.el.sceneEl && this.el.sceneEl.systems && this.el.sceneEl.systems.collision;
    const shieldIsGone = !shieldEl || !shieldEl.components.shield || shieldEl.components.shield.destroyed || (collisionSystem && collisionSystem.shieldDestroyed);

    if (!shieldIsGone && shieldEl && shieldEl.components.shield) {
      const shieldRadius = shieldEl.components.shield.data.radius;
      if (distanceToCenter <= shieldRadius + this.data.size) {
        shieldEl.components.shield.takeDamage(this.data.damage);
        this.destroy(false);
        return;
      }
    }

    if (earthEl && earthEl.components.earth) {
      const earthRadius = earthEl.components.earth.data.radius;
      if (distanceToCenter <= earthRadius + this.data.size) {
        earthEl.components.earth.takeDamage(this.data.damage);
        this.destroy(false);
        return;
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
      explosion.setAttribute('gltf-model', 'assets/meteor_explosion/scene.gltf');
      explosion.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
      
      // Scale explosion appropriately (was 0.35, made slightly larger for visibility)
      explosion.setAttribute('scale', '0.2 0.2 0.2');
      
      // Use the correct animation name found in GLTF: 'Meteor_Explode' (confirmed in previous usage, but re-verifying)
      // Based on common practices and the user's previous code, 'Meteor_Explode' seems to be the intended clip.
      // However, to be safe and ensure it plays WHATEVER animation is there (since we saw many accessors but no explicit animation names in the raw read),
      // we can try a more robust approach or stick to the known working one if verified.
      // Given the user specifically asked to "examine" and "use that for the break animation", 
      // and the previous code used 'Meteor_Explode', we will stick with that but ensure it's set up to unload.
      explosion.setAttribute('animation-mixer', 'clip: *; loop: once; clampWhenFinished: true');
      
      scene.appendChild(explosion);
      
      // Remove explosion after animation completes (or a safe fallback time)
      const cleanup = () => {
        if (explosion && explosion.parentNode) {
          explosion.parentNode.removeChild(explosion);
          // Optional: Explicitly dispose if using three.js internals, but A-Frame handles most DOM removal cleanup.
        }
      };
      
      // Listen for animation finish
      explosion.addEventListener('animation-finished', cleanup);
      
      // Fallback cleanup in case animation event misses or is too long
      // Reduced from 2500ms to 1000ms for quicker memory release as requested ("unlaod to release some memory")
      setTimeout(cleanup, 200);
    }

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
    TypingEngine.removeTarget(this.el.id);
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  },

  highlight: function(enabled) {
    const text = this.textEl;
    if (text) {
      text.setAttribute('color', enabled ? '#ff4444' : '#ffffff');
    }
  }
});
