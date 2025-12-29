
AFRAME.registerComponent('projectile-system', {
  

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
