/**
 * ConfettiComponent.js
 * Spawns lightweight confetti particles when 'game-over' is emitted
 */
AFRAME.registerComponent('confetti', {
  schema: {
    count: { type: 'int', default: 40 },
    spread: { type: 'number', default: 6 },
    size: { type: 'number', default: 0.08 },
    duration: { type: 'number', default: 1200 }
  },

  init() {
    // Listen to game-over event on the scene
    this.el.sceneEl.addEventListener('game-over', (e) => {
      // Slight delay to allow UI to show
      setTimeout(() => this.launch(e.detail || {}), 40);
    });
  },

  launch() {
    const { count, spread, size, duration } = this.data;
    const scene = this.el.sceneEl;

    // Try to get camera position, fallback to origin
    let camPos = new THREE.Vector3(0, 4, 8);
    try {
      if (scene.camera && scene.camera.el) {
        camPos.copy(scene.camera.el.object3D.getWorldPosition(new THREE.Vector3()));
      }
    } catch (e) {}

    const colors = ['#FF7A7A','#FFD36B','#8AF27E','#5AD8FF','#B08CFF','#FF6EC7'];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('a-entity');
      const r = size * (0.6 + Math.random() * 1.2);
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.setAttribute('geometry', `primitive: sphere; radius: ${r}`);
      p.setAttribute('material', `color: ${color}; shader: flat; transparent: true; opacity: 1`);

      // Position slightly in front of camera with some random spread
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        Math.random() * spread * 0.6,
        - (1 + Math.random() * 2)
      );

      const start = camPos.clone().add(offset);
      p.object3D.position.copy(start);

      // Randomized end position and motion
      const end = start.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread * 2, - (1 + Math.random() * 4), - (2 + Math.random() * 6)));

      p.setAttribute('animation__move', `property: position; to: ${end.x} ${end.y} ${end.z}; dur: ${duration}; easing: cubic-bezier(.17,.67,.32,1);`);
      p.setAttribute('animation__rot', `property: rotation; to: ${Math.random()*360} ${Math.random()*360} ${Math.random()*360}; dur: ${duration}; easing: linear;`);
      p.setAttribute('animation__fade', `property: material.opacity; to: 0; dur: ${duration}; easing: linear;`);

      scene.appendChild(p);

      // Cleanup after duration
      setTimeout(() => {
        if (p && p.parentNode) p.parentNode.removeChild(p);
      }, duration + 200);
    }
  }
});