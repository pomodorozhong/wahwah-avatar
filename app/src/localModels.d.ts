declare module 'virtual:local-models' {
  /** .vrm files found under public/models, relative to it (see tools/localModels.ts). */
  const models: { vrm: string[] };
  export default models;
}
