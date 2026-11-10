import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import type { FaceHost } from './host';

/** A print registration layer over the shaded, animated character. */
export class ComicPrintPass {
  private readonly target = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture: new THREE.DepthTexture(1, 1),
  });
  private readonly uniforms = {
    sceneColor: { value: this.target.texture },
    sceneDepth: { value: this.target.depthTexture },
    texel: { value: new THREE.Vector2(1, 1) },
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
      uniform sampler2D sceneDepth;
      uniform vec2 texel;
      varying vec2 screenUv;
      void main() {
        vec4 base = texture2D(sceneColor, screenUv);
        float depth = texture2D(sceneDepth, screenUv).r;
        vec2 offset = texel * vec2(1.5, 0.5);
        vec3 left = texture2D(sceneColor, screenUv - offset).rgb;
        vec3 right = texture2D(sceneColor, screenUv + offset).rgb;
        float edge = clamp(length(left - right) * 3.0, 0.0, 1.0);
        // A small cyan/magenta separation is restricted to character edges.
        float onCharacter = 1.0 - step(0.99999, depth);
        vec3 registered = vec3(left.r, right.g, right.b);
        gl_FragColor = vec4(mix(base.rgb, registered, edge * onCharacter * 0.65), base.a);
        #include <colorspace_fragment>
      }
    `,
  }));

  render(renderer: THREE.WebGLRenderer, host: FaceHost, width: number, height: number): void {
    const scale = Math.min(renderer.getPixelRatio(), 1.5);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    this.target.setSize(w, h);
    this.uniforms.texel.value.set(1 / w, 1 / h);
    renderer.setRenderTarget(this.target);
    renderer.render(host.scene, host.camera);
    renderer.setRenderTarget(null);
    this.quad.render(renderer);
  }
}
