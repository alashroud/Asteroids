/**
 * CollisionSystem.js - Handles collision detection between asteroids, earth, and shield
 * 
 * This A-Frame system manages:
 * - Tracking all active asteroids in the scene
 * - Detecting collisions between asteroids and shield/earth
 * - Managing shield destruction state
 * - Applying damage to earth and shield on collision
 * - Emitting collision events for other systems
 * 
 * Collision Priority:
 * 1. Shield collision (if shield exists and not destroyed)
 * 2. Earth collision (if shield is bypassed or destroyed)
 * 
 * @system collision
 */
AFRAME.registerSystem('collision', {
  
  /**
   * Initialize the collision system
   * Sets up asteroid tracking array and collision check throttling
   */
  init: function() {
    this.asteroids = [];           // Array of active asteroid entities
    this.earth = null;             // Reference to earth entity
    this.shield = null;            // Reference to shield entity
    this.shieldDestroyed = false;  // Flag to track if shield is destroyed
    this.checkInterval = 16;       // Check collisions every 16ms (~60fps) to prevent fast asteroids from passing through
    this.lastCheck = 0;            // Timestamp of last collision check
    
    this.setupListeners();
  },

  /**
   * Set up event listeners for asteroid and shield lifecycle events
   * Listens for:
   * - asteroid-spawned: Add new asteroids to tracking
   * - asteroid-destroyed: Remove asteroids from tracking
   * - shield-destroyed: Mark shield as destroyed
   */
  setupListeners: function() {
    // Listen for asteroid spawns - add to tracking array
    this.el.addEventListener('asteroid-spawned', (e) => {
      if (e.detail && e.detail.asteroid) {
        this.asteroids.push(e.detail.asteroid);
      }
    });

    // Listen for asteroid destruction - remove from tracking array
    this.el.addEventListener('asteroid-destroyed', (e) => {
      if (e.detail && e.detail.asteroid) {
        const index = this.asteroids.indexOf(e.detail.asteroid);
        if (index > -1) {
          this.asteroids.splice(index, 1);
        }
      }
    });

    // Listen for shield destruction - mark shield as destroyed
    this.el.addEventListener('shield-destroyed', () => {
      console.log('Shield destroyed - Earth is now vulnerable!');
      this.shieldDestroyed = true;
      this.shield = null;
    });
  },

  /**
   * Main collision detection loop (called every frame)
   * Throttled to check every 16ms (~60fps) to prevent fast asteroids from passing through
   * 
   * @param {number} time - Total elapsed time in milliseconds
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  tick: function(time, deltaTime) {
    // Throttle collision checks to every 16ms to catch fast-moving asteroids
    if (time - this.lastCheck < this.checkInterval) return;
    this.lastCheck = time;

    // Get earth reference (lazy initialization)
    if (!this.earth) {
      const earthEl = document.querySelector('#earth');
      if (earthEl && earthEl.components.earth) {
        this.earth = earthEl;
        console.log('🌍 Earth reference acquired');
      }
    }

    // Get shield reference (lazy initialization, only if not destroyed)
    if (!this.shield && !this.shieldDestroyed) {
      const shieldEl = document.querySelector('#shield');
      if (shieldEl && shieldEl.components.shield) {
        this.shield = shieldEl;
        console.log('Shield reference acquired');
      }
    }

    // Clean up destroyed asteroids from tracking array
    this.asteroids = this.asteroids.filter(a => a.parentNode && a.components['asteroid-component'] && !a.components['asteroid-component'].destroyed);

    // Check collisions for each active asteroid
    this.asteroids.forEach(asteroid => {
      this.checkAsteroidCollisions(asteroid);
    });
  },

  /**
   * Check if an asteroid is colliding with shield or earth
   * Uses sphere-sphere collision detection based on distance
   * 
   * Collision order:
   * 1. Check shield collision first (if shield exists)
   * 2. Check earth collision (if no shield collision)
   * 
   * @param {Element} asteroid - The asteroid entity to check
   */
  checkAsteroidCollisions: function(asteroid) {
    // Skip if asteroid is invalid or already destroyed
    if (!asteroid.components['asteroid-component'] || asteroid.components['asteroid-component'].destroyed) return;

    const asteroidPos = asteroid.object3D.position;
    const asteroidSize = asteroid.components['asteroid-component'].data.size;
    const distanceToCenter = asteroidPos.length(); // Distance from origin (0,0,0)

    // Check shield collision first (if shield exists and not destroyed)
    if (this.shield && this.shield.components.shield && !this.shieldDestroyed) {
      const shieldRadius = this.shield.components.shield.data.radius;

      // Sphere-sphere collision: distance <= sum of radii
      if (distanceToCenter <= shieldRadius + asteroidSize) {
        this.handleShieldCollision(asteroid);
        return; // Don't check earth if hit shield
      }
    }

    // Check earth collision (always check if shield is bypassed or destroyed)
    if (this.earth && this.earth.components.earth) {
      const earthRadius = this.earth.components.earth.data.radius;

      // Sphere-sphere collision: distance <= sum of radii
      if (distanceToCenter <= earthRadius + asteroidSize) {
        this.handleEarthCollision(asteroid);
        return;
      }
    }
  },

  /**
   * Handle collision between asteroid and shield
   * Applies damage to shield, destroys asteroid
   * If shield health reaches zero, marks shield as destroyed
   * 
   * @param {Element} asteroid - The asteroid that collided with shield
   */
  handleShieldCollision: function(asteroid) {
    console.log('Shield collision!');

    const damage = 10; // Damage dealt to shield per asteroid
    
    // Apply damage to shield
    if (this.shield && this.shield.components.shield) {
      const destroyed = this.shield.components.shield.takeDamage(damage);
      
      // Check if shield was destroyed by this hit
      if (destroyed) {
        console.log('Shield destroyed! Earth is now vulnerable!');
        this.shieldDestroyed = true;
        this.shield = null;
      }
    }

    // Destroy the asteroid (not typed by user)
    if (asteroid.components['asteroid-component']) {
      asteroid.components['asteroid-component'].destroy(false);
    }

    // Emit collision event for other systems (scoring, sound effects, etc.)
    this.el.emit('collision-asteroid-shield', {
      asteroid: asteroid,
      damage: damage
    });
  },

  /**
   * Handle collision between asteroid and earth
   * Applies damage to earth, destroys asteroid
   * May trigger game over if earth health reaches zero
   * 
   * @param {Element} asteroid - The asteroid that collided with earth
   */
  handleEarthCollision: function(asteroid) {
    console.log('EARTH COLLISION!');

    const damage = 15; // Damage dealt to earth per asteroid (higher than shield)
    
    // Apply damage to earth
    if (this.earth && this.earth.components.earth) {
      this.earth.components.earth.takeDamage(damage);
    }

    // Destroy the asteroid (not typed by user)
    if (asteroid.components['asteroid-component']) {
      asteroid.components['asteroid-component'].destroy(false);
    }

    // Emit collision event for other systems (scoring, sound effects, etc.)
    this.el.emit('collision-asteroid-earth', {
      asteroid: asteroid,
      damage: damage
    });
  }
});
