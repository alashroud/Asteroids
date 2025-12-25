/* global AFRAME */
import TypingEngine from '../../game/TypingEngine.js';
import GameEngine from '../../game/GameEngine.js';

AFRAME.registerComponent('asteroid-component', {
  schema: {
    word: { type: 'string', default: 'ERROR' },
    speed: { type: 'number', default: 2.0 },
    damage: { type: 'number', default: 10 },
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
    this.textEl.setAttribute('position', '0 1.2 0'); 
    
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
  },

  tick: function(time, delta) {
    if (!delta) return;

    // 1. Move the ENTIRE container (Text + Model) towards Earth
    // Assuming Earth is at Z = -3 and asteroids spawn at Z = -20
    const moveAmount = (this.data.speed * delta) / 1000;
    this.el.object3D.position.z += moveAmount;

    // 2. Rotate ONLY the model child (Text stays steady)
    if (this.modelEl) {
      this.modelEl.object3D.rotation.x += this.rotationAxis.x * (delta / 1000);
      this.modelEl.object3D.rotation.y += this.rotationAxis.y * (delta / 1000);
      this.modelEl.object3D.rotation.z += this.rotationAxis.z * (delta / 1000);
    }

    // 3. Collision Check
    // Earth is at Z = -3. If we pass -3.5, we hit it.
    if (this.el.object3D.position.z > -3.5) {
      this.hitEarth();
    }
  },

  hitEarth: function() {
    const earth = document.getElementById('earth');
    
    if (earth && earth.components['earth-component']) {
      // Apply Damage
      const currentHealth = earth.components['earth-component'].data.health;
      const newHealth = currentHealth - this.data.damage;
      
      earth.setAttribute('earth-component', 'health', newHealth);
      earth.emit('damage-taken'); 
      console.log(`Impact! Earth Health: ${newHealth}`);

      // Check Game Over
      if (newHealth <= 0) {
        GameEngine.stopGame();
      }
    }

    this.removeSelf();
  },

  removeSelf: function() {
    TypingEngine.removeTarget(this.el.id);
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
});