import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import type { FaceHost } from './host';
import { inkMethods, type InkMethod } from './inkMethods';

/** Rasterize the moving rig on a small grid, then map each cell to the ink palette. */
export class InkDitherPass {
  private readonly target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  private readonly uniforms = {
    sceneColor: { value: this.target.texture },
    strength: { value: 1 },
    levels: { value: 2 },
    clustered: { value: false },
  };
  private readonly quad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: this.uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: `
      varying vec2 screenUv;
      void main() {
        screenUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D sceneColor;
      uniform float strength;
      uniform float levels;
      uniform bool clustered;
      varying vec2 screenUv;
      const int bayer[16] = int[16](0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);
      const int dots[16] = int[16](12,5,6,13, 4,0,1,7, 11,3,2,8, 15,10,9,14);
      void main() {
        ivec2 size = textureSize(sceneColor, 0);
        ivec2 cell = min(ivec2(screenUv * vec2(size)), size - 1);
        vec3 linearColor = texelFetch(sceneColor, cell, 0).rgb;
        float luma = dot(linearColor, vec3(0.2126, 0.7152, 0.0722));
        float coverage = smoothstep(0.10, 0.84, sqrt(luma));
        int index = (cell.y % 4) * 4 + (cell.x % 4);
        float rank = float(clustered ? dots[index] : bayer[index]);
        float threshold = mix(0.5, (rank + 0.5) / 16.0, strength);
        float tone = floor(coverage * (levels - 1.0) + (1.0 - threshold)) / (levels - 1.0);
        vec3 ink = vec3(21, 27, 32) / 255.0;
        vec3 paper = vec3(232, 223, 198) / 255.0;
        gl_FragColor = vec4(mix(ink, paper, tone), 1.0);
      }
    `,
  }));

  render(renderer: THREE.WebGLRenderer, host: FaceHost, width: number, height: number, method: InkMethod): void {
    const { strength, levels, clustered } = inkMethods[method];
    this.uniforms.strength.value = strength;
    this.uniforms.levels.value = levels;
    this.uniforms.clustered.value = clustered;
    const rows = Math.min(height, 144);
    this.target.setSize(Math.max(1, Math.round(rows * width / height)), rows);
    renderer.setRenderTarget(this.target);
    renderer.render(host.scene, host.camera);
    renderer.setRenderTarget(null);
    this.quad.render(renderer);
  }
}
