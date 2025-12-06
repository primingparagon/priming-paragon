import './styles.css';
import { initScene } from './scene';
import { setupTheatre, playAnimation } from './theatre-setup';

async function start() {
  const container = document.getElementById('canvas-container')!;
  const { renderer, camera, controls, scene, resize } = initScene(container);

  // example: load models or placeholder geometry
  // initScene returns scene so you can add your GLTFs there.

  // theatre setup
  const { project, sheet } = setupTheatre(scene);

  // Hook up UI
  const btn = document.getElementById('animateBtn')!;
  btn.addEventListener('click', () => {
    playAnimation(project, sheet);
  });

  // render loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // resize observer
  window.addEventListener('resize', resize);
}

start().catch(err => console.error(err));

