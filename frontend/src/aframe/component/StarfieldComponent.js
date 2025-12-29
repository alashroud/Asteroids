AFRAME.registerComponent('starfield', {
  schema: {
    count: { type: 'int', default: 600 },
    spread: { type: 'number', default: 120 },
    speed: { type: 'number', default: 0.0005 },
    twinkle: { type: 'number', default: 0.03 }
  },

  init() {
    this.stars = [];
    const { count, spread } = this.data;

    for (let i = 0; i < count; i++) {
      const star = document.createElement('a-entity');
      const size = (Math.random() * 0.06) + 0.01;
      const x = (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread * 0.5;
      const z = (Math.random() - 0.5) * spread;

      star.setAttribute('geometry', `primitive: sphere; radius: ${size}`);
      star.setAttribute('material', `color: #ffffff; shader: flat; opacity: ${0.6 + Math.random() * 0.4}; transparent: true`);
      star.setAttribute('position', `${x} ${y} ${z}`);
      star.classList.add('starfield-star');

      // small twinkle using animation attribute (CSS-like tweak)
      const twinkleDelay = Math.random() * 3;
      const twinkleDuration = 1 + Math.random() * 2;
      star.setAttribute('animation__twinkle', `property: material.opacity; from: 0.3; to: ${0.8 + Math.random() * 0.2}; dir: alternate; dur: ${1000 * twinkleDuration}; loop: true; delay: ${Math.floor(twinkleDelay * 1000)}`);

      this.el.appendChild(star);
      this.stars.push(star);
    }
  },

  tick(time, timeDelta) {
    // Slight parallax rotation to give depth
    const m = 1 + this.data.speed * timeDelta;
    this.el.object3D.rotation.y += this.data.speed * (timeDelta * 0.02);

    // Optionally, we could rotate individual stars slowly for variety
  },

  remove() {
    // Clean up DOM nodes
    this.stars.forEach(s => {
      if (s.parentNode) s.parentNode.removeChild(s);
    });
    this.stars = [];
  }
});