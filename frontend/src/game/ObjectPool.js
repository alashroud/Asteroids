export class ObjectPool {
    constructor(sceneEl, poolSize = 20) {
      this.scene = sceneEl;
      this.pool = [];
      this.active = [];
  
      console.log(`Initializing ObjectPool with ${poolSize} entities...`);
  
      // Pre-instantiate asteroids
      for (let i = 0; i < poolSize; i++) {
        const el = document.createElement('a-entity');
        el.setAttribute('id', `pool-asteroid-${i}`);
        el.setAttribute('visible', false); // Hide initially
        
        // Initialize with dummy data to ensure component is attached and ready
        el.setAttribute('asteroid-component', 'word: INIT; speed: 0; useModel: true'); 
        
        // Move out of view
        el.setAttribute('position', '0 -100 0');
  
        this.scene.appendChild(el);
        this.pool.push(el);
      }
    }
  

    getAsteroid(word, speed) {
      if (this.pool.length === 0) {
        console.warn("ObjectPool empty! Consider increasing pool size.");
        // Optional: Expand pool dynamically if needed
        return null; 
      }
  
      const el = this.pool.pop();
      this.active.push(el);
  
      // Reset State
      el.setAttribute('visible', true);
      
      // Update Component Data
      el.setAttribute('asteroid-component', {
        word: word,
        speed: speed,
        damage: 10,
        useModel: true
      });
      
      return el;
    }
  
    returnAsteroid(el) {
      // Remove from active list
      const index = this.active.indexOf(el);
      if (index > -1) this.active.splice(index, 1);
  
      // Reset Visuals
      el.setAttribute('visible', false);
      el.setAttribute('position', '0 -100 0'); // Move out of view
      
      // Stop movement
      el.setAttribute('asteroid-component', 'speed', 0);
  
      // Return to pool
      this.pool.push(el);
    }
  }