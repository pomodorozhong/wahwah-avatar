import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FaceNavigation } from '../src/shared/host/faceNavigation';

const corner = new THREE.Vector3(0.43, 0.31, 1).normalize();

function nav(distance: number, center: THREE.Vector3, direction?: THREE.Vector3): FaceNavigation {
  const n = new FaceNavigation(new THREE.PerspectiveCamera(20, 1, 0.05, 20));
  n.frame(distance, center, direction);
  return n;
}

const close = (a: THREE.Vector3, b: THREE.Vector3) => expect(a.distanceTo(b)).toBeLessThan(1e-6);

describe('FaceNavigation relative views', () => {
  it('is the identity view at home', () => {
    const view = nav(2, new THREE.Vector3(0, 1.4, 0)).relativeView()!;
    expect(view.theta).toBeCloseTo(0);
    expect(view.phi).toBeCloseTo(0);
    expect(view.zoom).toBeCloseTo(1);
    view.pan.forEach((p) => expect(p).toBeCloseTo(0));
  });

  it('has no view before the model is framed', () => {
    expect(new FaceNavigation(new THREE.PerspectiveCamera()).relativeView()).toBeNull();
  });

  it('copies zoom as a ratio and pan in home units to a differently framed cell', () => {
    const face = nav(2, new THREE.Vector3(0, 1.4, 0));
    const cube = nav(4, new THREE.Vector3(0, 0.5, 0), corner);
    face.applyView({ theta: 0, phi: 0, zoom: 0.5, pan: [0.1, 0, 0] });
    cube.applyView(face.relativeView()!);
    // The face moved 0.2 m to its right (+x); the cube moves 0.4 m to its home camera's right.
    const cubeRight = new THREE.Vector3().crossVectors(corner.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
    close(cube.target, new THREE.Vector3(0, 0.5, 0).addScaledVector(cubeRight, 0.4));
    expect(cube.object.position.distanceTo(cube.target)).toBeCloseTo(2);
  });

  it('round-trips an orbit', () => {
    const a = nav(2, new THREE.Vector3(0, 1.4, 0));
    const b = nav(3, new THREE.Vector3(1, 0, 0), corner);
    const view = { theta: 0.4, phi: -0.2, zoom: 1.3, pan: [0.05, -0.02, 0.01] as [number, number, number] };
    a.applyView(view);
    b.applyView(a.relativeView()!);
    const back = b.relativeView()!;
    expect(back.theta).toBeCloseTo(view.theta);
    expect(back.phi).toBeCloseTo(view.phi);
    expect(back.zoom).toBeCloseTo(view.zoom);
    back.pan.forEach((p, i) => expect(p).toBeCloseTo(view.pan[i]));
  });
});
