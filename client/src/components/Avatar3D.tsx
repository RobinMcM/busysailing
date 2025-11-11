import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sphere, Box } from '@react-three/drei';
import * as THREE from 'three';

interface AvatarModelProps {
  isActive: boolean;
  isSpeaking: boolean;
}

function AvatarModel({ isActive, isSpeaking }: AvatarModelProps) {
  const headRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  
  // Subtle idle animation
  useFrame((state) => {
    if (headRef.current) {
      // Gentle breathing motion
      headRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      
      // Subtle rotation
      headRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
    
    // Mouth animation when speaking
    if (mouthRef.current && isSpeaking) {
      const mouthScale = 0.3 + Math.sin(state.clock.elapsedTime * 8) * 0.15;
      mouthRef.current.scale.setScalar(mouthScale);
    } else if (mouthRef.current) {
      mouthRef.current.scale.setScalar(0.3);
    }
  });
  
  return (
    <group>
      {/* Head - Sphere */}
      <Sphere ref={headRef} args={[1, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={isActive ? "#f0e4d7" : "#d0c4b7"}
          roughness={0.4}
          metalness={0.1}
        />
      </Sphere>
      
      {/* Eyes */}
      <Sphere args={[0.12, 16, 16]} position={[-0.3, 0.2, 0.85]}>
        <meshStandardMaterial color="#2c3e50" />
      </Sphere>
      <Sphere args={[0.12, 16, 16]} position={[0.3, 0.2, 0.85]}>
        <meshStandardMaterial color="#2c3e50" />
      </Sphere>
      
      {/* Eye highlights */}
      <Sphere args={[0.04, 8, 8]} position={[-0.28, 0.25, 0.95]}>
        <meshStandardMaterial color="white" />
      </Sphere>
      <Sphere args={[0.04, 8, 8]} position={[0.32, 0.25, 0.95]}>
        <meshStandardMaterial color="white" />
      </Sphere>
      
      {/* Nose */}
      <Box args={[0.15, 0.2, 0.3]} position={[0, -0.05, 0.95]}>
        <meshStandardMaterial color="#e0d4c7" roughness={0.5} />
      </Box>
      
      {/* Mouth */}
      <Sphere ref={mouthRef} args={[0.3, 16, 16]} position={[0, -0.4, 0.85]} scale={0.3}>
        <meshStandardMaterial color="#8b4545" />
      </Sphere>
      
      {/* Hair/Top of head */}
      <Sphere args={[1.05, 32, 32]} position={[0, 0.3, 0]} scale={[1, 0.8, 1]}>
        <meshStandardMaterial color="#5a4a3a" roughness={0.7} />
      </Sphere>
      
      {/* Glow effect when speaking */}
      {isSpeaking && (
        <pointLight
          position={[0, 0, 2]}
          intensity={1.5}
          color="#4a90e2"
          distance={5}
        />
      )}
    </group>
  );
}

interface Avatar3DProps {
  isActive: boolean;
  isSpeaking: boolean;
  className?: string;
}

export default function Avatar3D({ isActive, isSpeaking, className = '' }: Avatar3DProps) {
  return (
    <div className={`${className}`} data-testid="avatar-3d-scene">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#f0e4d7" />
        
        {/* Avatar Model */}
        <AvatarModel isActive={isActive} isSpeaking={isSpeaking} />
        
        {/* Environment for realistic reflections */}
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
