// Opaque module boundary for the 3D decision engine.
//
// The real implementation (src/three/DecisionEngine.tsx) imports
// @react-three/fiber, which does `declare global { namespace JSX { ... } }`
// to add ~150 three.js intrinsic elements. If that augmentation enters the
// main TS program it inflates MUI's Box/sx types past the union-complexity
// limit (TS2590) on every component. By importing the engine through this
// declared module instead of a real path, fiber's types stay out of the main
// program. Vite aliases this specifier to the real file at build/runtime.
declare module '@buywise/decision-engine-3d' {
  import type { ComponentType } from 'react';
  const DecisionEngine: ComponentType<{ quality?: 'high' | 'low' }>;
  export default DecisionEngine;
}
