/**
 * ProjectileSystem.js - Handles laser projectile firing and collision detection
 * 
 * This A-Frame component manages:
 * - Firing laser projectiles from ship toward target asteroids
 * - Projectile movement and orientation
 * - Collision detection between projectiles and asteroids
 * - Projectile lifecycle (creation, movement, destruction)
 * - Visual trail effect for projectiles
 * 
 * Projectiles are spawned when user completes typing an asteroid word
 * and automatically travel toward the target until collision or timeout.
 * 
 * @component projectile-system
 */
AFRAME.registerComponent('projectile-system', {
  
  /**
   * Initialize the projectile system
   * Creates array to track all active projectiles
   */
  init: function() {
    this.projectiles = []; // Array of active projectile objects
    if (this.el && this.el.sceneEl) {
      this.el.sceneEl.addEventListener('game-over', () => {
        this.clearAll();
      });
      this.el.sceneEl.addEventListener('game-paused', () => {
        // No-op; tick will respect global pause flag
      });
      this.el.sceneEl.addEventListener('game-resumed', () => {
        // No-op
      });
    }
  },

  /**
   * Fire a laser projectile at a target asteroid
   * Creates a green laser with glowing trail effect
   * Projectile automatically travels toward target and checks for collision
   * 
   * @param {Element} targetAsteroid - The asteroid entity to fire at
   */
  fireAtTarget: function(targetAsteroid) {
    const ship = this.el;
    const shipPos = ship.object3D.position.clone();
    const targetPos = targetAsteroid.object3D.position.clone();
    
    // Create main laser projectile body
    const projectile = document.createElement('a-entity');
    projectile.setAttribute('geometry', {
      primitive: 'cylinder',
      radius: 0.15,
      height: 2
    });
    projectile.setAttribute('material', {
      color: '#00ff00',
      emissive: '#00ff00',
      emissiveIntensity: 1.5,
      shader: 'flat'
    });
    
    // Add glowing trail to laser for visual effect
    const trail = document.createElement('a-entity');
    trail.setAttribute('geometry', {
      primitive: 'cylinder',
      radius: 0.3,
      height: 3
    });
    trail.setAttribute('material', {
      color: '#00ff00',
      emissive: '#00ff00',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.4,
      shader: 'flat'
    });
    projectile.appendChild(trail);
    
    // Position projectile at ship's location
    projectile.object3D.position.copy(shipPos);
    
    // Calculate direction vector from ship to target
    const direction = new THREE.Vector3();
    direction.subVectors(targetPos, shipPos).normalize();
    
    // Orient projectile to point toward target
    // Converts default Y-up orientation to direction vector
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    projectile.object3D.quaternion.copy(quaternion);
    
    // Add projectile to scene
    this.el.sceneEl.appendChild(projectile);
    
    // Store projectile data for tracking and collision detection
    this.projectiles.push({
      el: projectile,              // The entity element
      direction: direction,        // Normalized direction vector
      speed: 60,                   // Units per second
      target: targetAsteroid,      // Reference to target asteroid
      hitRadius: 2.5,              // Collision detection radius
      createdAt: Date.now(),       // Timestamp for lifetime tracking
      maxLifetime: 5000            // Maximum lifetime in milliseconds
    });
    
    console.log('Projectile fired with trail!');
  },

  /**
   * Update all active projectiles (called every frame)
   * Handles:
   * - Projectile movement along direction vector
   * - Collision detection with target asteroids
   * - Removal of projectiles that hit targets
   * - Removal of projectiles that exceed max lifetime (missed shots)
   * 
   * Iterates backwards to safely remove elements during iteration
   * 
   * @param {number} time - Total elapsed time in milliseconds
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  tick: function(time, deltaTime) {
    if (window.__GAME_PAUSED__ === true) return;
    const dt = deltaTime / 1000; // Convert to seconds
    
    // Update all projectiles (iterate backwards for safe removal)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      
      // Move projectile along its direction vector
      const movement = proj.direction.clone().multiplyScalar(proj.speed * dt);
      proj.el.object3D.position.add(movement);
      
      // Check collision with target asteroid
      if (proj.target && proj.target.components['asteroid-component'] && !proj.target.components['asteroid-component'].destroyed) {
        const projPos = proj.el.object3D.position;
        const targetPos = proj.target.object3D.position;
        const distance = projPos.distanceTo(targetPos);
        
        // Sphere-sphere collision detection
        if (distance < proj.hitRadius) {
          console.log('Projectile HIT asteroid!');
          
          // Destroy the asteroid (typed=true for scoring)
          proj.target.components['asteroid-component'].destroy(true);
          
          // Remove projectile from scene and tracking array
          proj.el.parentNode.removeChild(proj.el);
          this.projectiles.splice(i, 1);
          continue;
        }
      }
      
      // Remove projectiles that exceed max lifetime (missed shot)
      if (Date.now() - proj.createdAt > proj.maxLifetime) {
        proj.el.parentNode.removeChild(proj.el);
        this.projectiles.splice(i, 1);
      }
    }
  }
  ,
  /**
   * Clear all active projectiles from the scene
   */
  clearAll: function() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      try {
        if (proj.el && proj.el.parentNode) {
          proj.el.parentNode.removeChild(proj.el);
        }
      } catch (e) {}
      this.projectiles.splice(i, 1);
    }
  }
});
