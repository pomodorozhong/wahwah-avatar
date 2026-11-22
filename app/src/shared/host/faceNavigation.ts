import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * A camera view relative to a cell's home framing, so it can be copied to a
 * cell whose model is framed differently: Tofu as a whole cube seen from a
 * corner, a VRM on its face from the front.
 */
export interface RelativeView {
  /** Orbit away from the home direction, in radians around the up axis and towards it. */
  theta: number;
  phi: number;
  /** Camera distance as a ratio of the home distance. */
  zoom: number;
  /** Pan of the target along the home camera's right, up and forward axes, in home distances. */
  pan: [number, number, number];
}

const offset = new THREE.Vector3();
const home = new THREE.Spherical();
const now = new THREE.Spherical();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const forward = new THREE.Vector3();
const EPS = 1e-4;

/** Frame a portrait while preserving the user's orbit, pan and relative zoom on resize. */
export class FaceNavigation extends OrbitControls {
  private homeDistance = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    super(camera);
    this.rotateSpeed = 0.65;
  }

  frame(distance: number, newCenter?: THREE.Vector3, direction?: THREE.Vector3): void {
    const previousDistance = this.homeDistance;
    this.homeDistance = distance;
    this.minDistance = distance * 0.35;
    this.maxDistance = distance * 3;
    if (newCenter) this.target0.copy(newCenter);
    this.position0.copy(this.target0);
    if (direction) this.position0.addScaledVector(direction, distance);
    else this.position0.z += distance;
    if (!previousDistance || newCenter) {
      this.reset();
      return;
    }

    // Keep the camera offset from the panned target in units of the home framing.
    this.object.position.sub(this.target).multiplyScalar(distance / previousDistance).add(this.target);
    this.update();
  }

  /** The home camera's right, up and forward axes. */
  private homeAxes(): void {
    forward.subVectors(this.target0, this.position0).normalize();
    right.crossVectors(forward, this.object.up).normalize();
    up.crossVectors(right, forward);
  }

  /** The current view relative to the home framing; null before the model is framed. */
  relativeView(): RelativeView | null {
    if (!this.homeDistance) return null;
    home.setFromVector3(offset.subVectors(this.position0, this.target0));
    now.setFromVector3(offset.subVectors(this.object.position, this.target));
    this.homeAxes();
    offset.subVectors(this.target, this.target0).divideScalar(this.homeDistance);
    return {
      theta: now.theta - home.theta,
      phi: now.phi - home.phi,
      zoom: now.radius / this.homeDistance,
      pan: [offset.dot(right), offset.dot(up), offset.dot(forward)],
    };
  }

  /** Show `view` relative to this cell's own home framing. Does nothing before the model is framed. */
  applyView(view: RelativeView): void {
    if (!this.homeDistance) return;
    this.homeAxes();
    this.target.copy(this.target0)
      .addScaledVector(right, view.pan[0] * this.homeDistance)
      .addScaledVector(up, view.pan[1] * this.homeDistance)
      .addScaledVector(forward, view.pan[2] * this.homeDistance);
    home.setFromVector3(offset.subVectors(this.position0, this.target0));
    home.theta += view.theta;
    home.phi = THREE.MathUtils.clamp(home.phi + view.phi, EPS, Math.PI - EPS);
    home.radius = THREE.MathUtils.clamp(view.zoom * this.homeDistance, this.minDistance, this.maxDistance);
    this.object.position.setFromSpherical(home).add(this.target);
    this.update();
  }
}
