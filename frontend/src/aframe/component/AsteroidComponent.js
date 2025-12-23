/* global AFRAME */
import TypingEngine from '../../game/TypingEngine.js';

/**
 * Asteroid Component - Destructible space rocks with word labels
 * 
 * Manages:
 * - Movement toward Earth
 * - Word display (Text)
 * - Rotation (Visuals)
 * - Collision detection with Earth
 */
AFRAME.registerComponent('asteroid-component', {
  schema: {
    word: { type: 'string', default: '' },
    speed: { type: 'number', default: 2.0 },
    damage: { type: 'number', default: 10 },
    rotationSpeed: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
    useModel: { type: 'boolean', default: false } // Set true if you have the GLTF loaded
  },

  init: function() {
    // 1. Setup Visuals (Model or Sphere)
    if (this.data.useModel) {
      this.el.setAttribute('gltf-model', '#asteroid-model');
      this.el.setAttribute('scale', '0.5 0.5 0.5');
    } else {
      // Fallback geometry for testing
      this.el.setAttribute('geometry', 'primitive: dodecahedron; radius: 0.5');
      this.el.setAttribute('material', 'color: #888; roughness: 1.0; flatShading: true');
    }

    // 2. Setup Text Label
    this.textEl = document.createElement('a-text');
    this.textEl.setAttribute('value', this.data.word);
    this.textEl.setAttribute('align', 'center');
    this.textEl.setAttribute('position', '0 0.8 0'); // Float above asteroid
    this.textEl.setAttribute('scale', '1.5 1.5 1.5');
    this.textEl.setAttribute('side', 'double');
    this.textEl.setAttribute('color', '#ffffff');
    // Ensure text always faces camera
    this.textEl.setAttribute('look-at', '[camera]'); 
    this.el.appendChild(this.textEl);

    // 3. Randomize Rotation Direction
    this.rotationAxis = {
      x: Math.random() * this.data.rotationSpeed.x,
      y: Math.random() * this.data.rotationSpeed.y,
      z: Math.random() * this.data.rotationSpeed.z
    };
  },

  tick: function(time, delta) {
    if (!delta) return;

    // 1. Move towards camera (Positive Z)
    // Note: In your scene, Earth is at Z = -3, Camera at Z = 0.
    // If asteroids spawn at Z = -20, they need to move POSITIVE Z to hit Earth.
    const moveAmount = (this.data.speed * delta) / 1000;
    this.el.object3D.position.z += moveAmount;

    // 2. Rotate the mesh (Visual only)
    this.el.object3D.rotation.x += this.rotationAxis.x * (delta / 1000);
    this.el.object3D.rotation.y += this.rotationAxis.y * (delta / 1000);
    this.el.object3D.rotation.z += this.rotationAxis.z * (delta / 1000);

    // 3. Collision Detection
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
      
      // Visual/Audio Feedback
      earth.emit('damage-taken'); 
      console.log(`Impact! Earth Health: ${newHealth}`);
    }

    // Cleanup
    this.removeSelf();
  },

  removeSelf: function() {
    // 1. Tell TypingEngine this word is gone (so user can't type it anymore)
    TypingEngine.removeTarget(this.el.id);

    // 2. Remove from DOM
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  },

  // Optional: Listen for typing progress to highlight text
  events: {
    'typing-progress': function(evt) {
      // Example: Turn text green as you type
      // This requires more complex text manipulation (coloring substrings)
      // For now, we just flash it
      this.textEl.setAttribute('color', '#00ff00');
    }
  }
});