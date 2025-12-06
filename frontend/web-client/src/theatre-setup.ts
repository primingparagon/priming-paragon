import { getProject, types } from '@theatre/core';
import studio from '@theatre/studio';
import * as THREE from 'three';

// initialize Theatre Studio (dev only)
// This will open the local studio UI if you run the studio separately.
// studio.initialize(); // optional if you want an embedded studio

export function setupTheatre(scene: THREE.Scene) {
  // initialize a lightweight project
  const project = getProject('PrimingParagon Project', { state: {} });
  const sheet = project.sheet('Scene Sheet');

  // create an object track for the placeholder cube
  const cube = scene.getObjectByName('theatreCube') as THREE.Object3D;
  if (!cube) {
    console.warn('No theatreCube found for theatre animations.');
    return { project, sheet };
  }

  // attach the cube to theatre state
  const obj = sheet.object('CubeController', {
    position: types('vec3', { x: cube.position.x, y: cube.position.y, z: cube.position.z }),
    rotation: types('vec3', { x: 0, y: 0, z: 0 }),
    scale: types('vec3', { x: cube.scale.x, y: cube.scale.y, z: cube.scale.z }),
    color: types('color', { r: 124 / 255, g: 92 / 255, b: 255 / 255 })
  });

  // take updates from theatre and apply to cube each frame (simple)
  project.onValuesChanged((newValues) => {
    const controller = newValues.CubeController;
    if (!controller) return;
    cube.position.set(controller.position.x, controller.position.y, controller.position.z);
    cube.rotation.set(controller.rotation.x, controller.rotation.y, controller.rotation.z);
    cube.scale.set(controller.scale.x, controller.scale.y, controller.scale.z);
    if ((cube as any).material) {
      (cube as any).material.color.setRGB(controller.color.r, controller.color.g, controller.color.b);
    }
  });

  return { project, sheet };
}

export function playAnimation(project: any, sheet: any) {
  // For demo: programmatically animate the sheet's object (simple keyframe)
  const obj = sheet.object('CubeController');
  const timeline = project.sequence; // use the default sequence
  // create quick keyframes by setting values and tweening via set during small intervals
  obj.setValues({
    position: { x: 0, y: 0.6, z: 0 },
    scale: { x: 0.6, y: 0.6, z: 0.6 },
    rotation: { x: 0, y: 0, z: 0 }
  });
  // quick manual 'animation' by incrementing rotation
  let t = 0;
  const id = setInterval(() => {
    t += 0.05;
    obj.setValues({
      rotation: { x: t * 2, y: t * 3, z: 0 },
      color: { r: Math.abs(Math.sin(t)), g: 0.2, b: Math.abs(Math.cos(t)) }
    });
    if (t > Math.PI * 2) {
      clearInterval(id);
    }
  }, 30);
}

