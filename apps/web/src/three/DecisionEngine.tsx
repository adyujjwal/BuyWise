import { useRef, useMemo, Suspense, type ReactNode } from 'react';
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * The BuyWise "Decision Engine" — an abstract intelligence core surrounded by
 * floating product cards, orbit paths, comparison links and price nodes.
 * It responds subtly to the pointer. Deliberately restrained: soft lighting,
 * matte materials, gentle motion. Not a game, not a spinning brain.
 *
 * Built on raw three + @react-three/fiber only — no @react-three/drei, to keep
 * the dependency tree small and the install fast on slow registries.
 */

type Quality = 'high' | 'low';

const BRAND = '#2BA878';
const INK = '#1C1E1B';
const PAPER = '#FCFBF8';

// ── Local primitives (replacing the handful of drei helpers we used) ───────

/** Gentle idle bob + sway. Mirrors drei <Float>'s sine-based motion. */
function Float({
  speed = 1,
  rotationIntensity = 1,
  floatIntensity = 1,
  children,
}: {
  speed?: number;
  rotationIntensity?: number;
  floatIntensity?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const seed = useRef(Math.random() * 10000);
  useFrame((state) => {
    if (!ref.current) return;
    const t = seed.current + state.clock.elapsedTime;
    ref.current.rotation.x = (Math.cos((t / 4) * speed) / 8) * rotationIntensity;
    ref.current.rotation.y = (Math.sin((t / 4) * speed) / 8) * rotationIntensity;
    ref.current.rotation.z = (Math.sin((t / 4) * speed) / 20) * rotationIntensity;
    ref.current.position.y = (Math.sin((t / 4) * speed) / 10) * floatIntensity;
  });
  return <group ref={ref}>{children}</group>;
}

/** Thin connector line (1px). Native WebGL line — no fat-line deps needed. */
function Connector({
  points,
  color,
  opacity,
}: {
  points: [number, number, number][];
  color: string;
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    return g;
  }, [points]);
  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
}

/** Soft contact-shadow substitute: a radial-gradient plane on the floor. */
function SoftShadow() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(28,30,27,0.55)');
    grad.addColorStop(0.7, 'rgba(28,30,27,0.12)');
    grad.addColorStop(1, 'rgba(28,30,27,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
  return (
    <mesh position={[0, -2.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[11, 11]} />
      <meshBasicMaterial map={texture} transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

// ── Scene content ──────────────────────────────────────────────────────────

function IntelligenceCore() {
  const inner = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (inner.current) inner.current.rotation.y += dt * 0.12;
    if (wire.current) {
      wire.current.rotation.y -= dt * 0.08;
      wire.current.rotation.x += dt * 0.03;
    }
  });
  return (
    <Float speed={1} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh ref={inner} castShadow>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color={INK} roughness={0.42} metalness={0.15} flatShading />
      </mesh>
      <mesh ref={wire} scale={1.28}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshBasicMaterial wireframe color={BRAND} transparent opacity={0.16} />
      </mesh>
      {/* chosen node — the pick */}
      <mesh position={[0.95, 1.0, 0.3]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={BRAND} emissive={BRAND} emissiveIntensity={0.5} />
      </mesh>
    </Float>
  );
}

function ProductCard({
  position,
  rotation,
  accent,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  accent: string;
}) {
  const cardGeometry = useMemo(() => new RoundedBoxGeometry(1.05, 1.4, 0.05, 4, 0.07), []);
  return (
    <Float speed={1.3} rotationIntensity={0.18} floatIntensity={0.6}>
      <group position={position} rotation={rotation}>
        <mesh geometry={cardGeometry} castShadow>
          <meshStandardMaterial color={PAPER} roughness={0.55} metalness={0} />
        </mesh>
        {/* image area */}
        <mesh position={[0, 0.28, 0.03]}>
          <planeGeometry args={[0.82, 0.6]} />
          <meshStandardMaterial color="#ECE8DF" roughness={0.9} />
        </mesh>
        {/* accent score chip */}
        <mesh position={[-0.26, -0.28, 0.03]}>
          <planeGeometry args={[0.28, 0.14]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
        {/* text lines */}
        <mesh position={[0.12, -0.28, 0.03]}>
          <planeGeometry args={[0.42, 0.07]} />
          <meshStandardMaterial color="#CFC9BC" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.46, 0.03]}>
          <planeGeometry args={[0.7, 0.055]} />
          <meshStandardMaterial color="#DED8CB" roughness={0.9} />
        </mesh>
      </group>
    </Float>
  );
}

function OrbitRing({ radius, tilt, opacity }: { radius: number; tilt: [number, number, number]; opacity: number }) {
  return (
    <mesh rotation={tilt}>
      <torusGeometry args={[radius, 0.004, 8, 120]} />
      <meshBasicMaterial color={INK} transparent opacity={opacity} />
    </mesh>
  );
}

function PriceNode({ position, accent }: { position: [number, number, number]; accent: string }) {
  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} />
      </mesh>
      <Connector points={[[0, 0, 0], position]} color={INK} opacity={0.1} />
    </group>
  );
}

function Scene({ quality }: { quality: Quality }) {
  const group = useRef<THREE.Group>(null);
  const cards = useMemo(
    () =>
      (
        [
          { position: [-2.5, 0.7, -0.5], rotation: [0.1, 0.5, 0.05], accent: BRAND },
          { position: [2.6, 0.3, -0.8], rotation: [-0.05, -0.5, -0.05], accent: '#B9822B' },
          { position: [-2.1, -1.1, 0.4], rotation: [0.08, 0.4, -0.08], accent: '#1E8E5A' },
          { position: [2.1, -1.3, 0.2], rotation: [-0.05, -0.4, 0.08], accent: '#BE4F39' },
          ...(quality === 'high'
            ? [{ position: [0.2, 1.9, -1.2], rotation: [0.2, 0.1, 0], accent: BRAND } as const]
            : []),
        ] as Array<{ position: [number, number, number]; rotation: [number, number, number]; accent: string }>
      ),
    [quality],
  );

  useFrame((state) => {
    if (!group.current) return;
    // Gentle pointer parallax, lerped so it never feels jittery.
    const px = state.pointer.x * 0.25;
    const py = state.pointer.y * 0.18;
    group.current.rotation.y += (px - group.current.rotation.y) * 0.045;
    group.current.rotation.x += (-py - group.current.rotation.x) * 0.045;
  });

  return (
    <group ref={group}>
      <IntelligenceCore />
      {cards.map((c, i) => (
        <ProductCard key={i} position={c.position} rotation={c.rotation} accent={c.accent} />
      ))}
      <OrbitRing radius={2.9} tilt={[Math.PI / 2.2, 0, 0]} opacity={0.1} />
      {quality === 'high' && <OrbitRing radius={3.5} tilt={[Math.PI / 1.9, 0.3, 0]} opacity={0.06} />}
      <PriceNode position={[1.7, 1.4, 0.6]} accent={BRAND} />
      <PriceNode position={[-1.9, 1.1, 0.3]} accent="#B9822B" />
      {quality === 'high' && <PriceNode position={[1.4, -1.7, 0.5]} accent="#1E8E5A" />}
    </group>
  );
}

export default function DecisionEngine({ quality = 'high' }: { quality?: Quality }) {
  return (
    <Canvas
      shadows={quality === 'high'}
      dpr={quality === 'high' ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: quality === 'high', alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 7.2], fov: 42 }}
      style={{ touchAction: 'pan-y' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} castShadow={quality === 'high'} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-5, -2, 3]} intensity={30} color={BRAND} distance={14} />
      <Suspense fallback={null}>
        <Scene quality={quality} />
        {quality === 'high' && <SoftShadow />}
      </Suspense>
    </Canvas>
  );
}

// Satisfy TS for intrinsic three elements when strict.
export type _R3F = ThreeElements;
