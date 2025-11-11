import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { WebGLFallback } from './WebGLFallback';

interface RealisticAvatarModelProps {
  isActive: boolean;
  isSpeaking: boolean;
  avatarType: 'consultant' | 'partner';
}

function RealisticAvatarModel({ isActive, isSpeaking, avatarType }: RealisticAvatarModelProps) {
  const headRef = useRef<THREE.Group>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const leftEyeLidRef = useRef<THREE.Mesh>(null);
  const rightEyeLidRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  
  const [blinkTimer, setBlinkTimer] = useState(0);
  
  // Avatar-specific colors
  const skinTone = avatarType === 'consultant' ? '#ffd4b3' : '#f5c9a8';
  const hairColor = avatarType === 'consultant' ? '#4a3a2a' : '#6b5748';
  const eyeColor = avatarType === 'consultant' ? '#4a7c59' : '#5e8ba3';
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (headRef.current) {
      // Gentle breathing and idle motion
      headRef.current.position.y = Math.sin(time * 0.6) * 0.03;
      headRef.current.rotation.y = Math.sin(time * 0.4) * 0.08;
      headRef.current.rotation.x = Math.sin(time * 0.5) * 0.04;
    }
    
    // Advanced lip-sync when speaking
    if (isSpeaking && upperLipRef.current && lowerLipRef.current && jawRef.current) {
      // Simulate phoneme-based mouth movements
      const talkCycle = Math.sin(time * 12) * 0.5 + 0.5; // 0 to 1
      const vowelShape = Math.sin(time * 8) * 0.5 + 0.5; // Different frequency for variety
      
      // Upper lip movement
      upperLipRef.current.position.y = -0.35 + vowelShape * 0.05;
      upperLipRef.current.scale.y = 1 + talkCycle * 0.3;
      
      // Lower lip and jaw movement
      const jawDrop = talkCycle * 0.15;
      lowerLipRef.current.position.y = -0.45 - jawDrop;
      jawRef.current.position.y = -0.6 - jawDrop * 0.5;
      lowerLipRef.current.scale.y = 1 + talkCycle * 0.2;
    } else if (upperLipRef.current && lowerLipRef.current && jawRef.current) {
      // Closed mouth at rest
      upperLipRef.current.position.y = -0.35;
      upperLipRef.current.scale.y = 1;
      lowerLipRef.current.position.y = -0.45;
      lowerLipRef.current.scale.y = 1;
      jawRef.current.position.y = -0.6;
    }
    
    // Natural blinking
    const blinkFrequency = 3 + Math.sin(time * 0.3) * 0.5; // Vary blink rate
    if (time % blinkFrequency < 0.15 && leftEyeLidRef.current && rightEyeLidRef.current) {
      // Blinking
      const blinkProgress = Math.sin((time % blinkFrequency) / 0.15 * Math.PI);
      leftEyeLidRef.current.scale.y = 1 - blinkProgress * 0.8;
      rightEyeLidRef.current.scale.y = 1 - blinkProgress * 0.8;
    } else if (leftEyeLidRef.current && rightEyeLidRef.current) {
      leftEyeLidRef.current.scale.y = 1;
      rightEyeLidRef.current.scale.y = 1;
    }
    
    // Eye tracking (subtle)
    if (leftEyeRef.current && rightEyeRef.current) {
      const lookX = Math.sin(time * 0.7) * 0.1;
      const lookY = Math.sin(time * 0.5) * 0.05;
      leftEyeRef.current.rotation.y = lookX;
      leftEyeRef.current.rotation.x = -lookY;
      rightEyeRef.current.rotation.y = lookX;
      rightEyeRef.current.rotation.x = -lookY;
    }
  });
  
  return (
    <group ref={headRef}>
      {/* Head - More realistic oval shape */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={skinTone}
          roughness={0.6}
          metalness={0.1}
          flatShading={false}
        />
      </mesh>
      
      {/* Face oval overlay for better shape */}
      <mesh position={[0, 0, 0.05]} scale={[0.95, 1.1, 0.8]} castShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={skinTone}
          roughness={0.5}
          metalness={0.05}
        />
      </mesh>
      
      {/* Cheekbones */}
      <mesh position={[-0.4, -0.1, 0.7]} scale={[0.3, 0.25, 0.3]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.65} />
      </mesh>
      <mesh position={[0.4, -0.1, 0.7]} scale={[0.3, 0.25, 0.3]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.65} />
      </mesh>
      
      {/* Eyes */}
      <group ref={leftEyeRef} position={[-0.3, 0.15, 0.75]}>
        {/* Eye white */}
        <mesh scale={[0.18, 0.15, 0.12]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Iris */}
        <mesh position={[0, 0, 0.12]}>
          <circleGeometry args={[0.08, 32]} />
          <meshStandardMaterial color={eyeColor} roughness={0.4} />
        </mesh>
        {/* Pupil */}
        <mesh position={[0, 0, 0.13]}>
          <circleGeometry args={[0.04, 32]} />
          <meshStandardMaterial color="#000000" roughness={0.2} />
        </mesh>
        {/* Eye highlight */}
        <mesh position={[-0.02, 0.02, 0.14]}>
          <circleGeometry args={[0.02, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      </group>
      
      <group ref={rightEyeRef} position={[0.3, 0.15, 0.75]}>
        {/* Eye white */}
        <mesh scale={[0.18, 0.15, 0.12]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Iris */}
        <mesh position={[0, 0, 0.12]}>
          <circleGeometry args={[0.08, 32]} />
          <meshStandardMaterial color={eyeColor} roughness={0.4} />
        </mesh>
        {/* Pupil */}
        <mesh position={[0, 0, 0.13]}>
          <circleGeometry args={[0.04, 32]} />
          <meshStandardMaterial color="#000000" roughness={0.2} />
        </mesh>
        {/* Eye highlight */}
        <mesh position={[-0.02, 0.02, 0.14]}>
          <circleGeometry args={[0.02, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      </group>
      
      {/* Eyelids */}
      <mesh ref={leftEyeLidRef} position={[-0.3, 0.22, 0.8]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.25, 0.08, 0.05]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>
      <mesh ref={rightEyeLidRef} position={[0.3, 0.22, 0.8]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.25, 0.08, 0.05]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>
      
      {/* Eyebrows */}
      <mesh position={[-0.3, 0.35, 0.75]} rotation={[0, 0, -0.1]} scale={[0.25, 0.05, 0.05]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, 0.35, 0.75]} rotation={[0, 0, 0.1]} scale={[0.25, 0.05, 0.05]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>
      
      {/* Nose */}
      <mesh position={[0, 0, 0.9]} scale={[0.15, 0.25, 0.35]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={skinTone} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.1, 0.95]} scale={[0.18, 0.12, 0.2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>
      
      {/* Nostrils */}
      <mesh position={[-0.08, -0.12, 1]} rotation={[0, 0.3, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#3a2820" roughness={0.9} />
      </mesh>
      <mesh position={[0.08, -0.12, 1]} rotation={[0, -0.3, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#3a2820" roughness={0.9} />
      </mesh>
      
      {/* Lips */}
      <mesh ref={upperLipRef} position={[0, -0.35, 0.85]} scale={[0.35, 0.08, 0.15]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#c77a6a" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh ref={lowerLipRef} position={[0, -0.45, 0.85]} scale={[0.32, 0.1, 0.15]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#b36959" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Jaw/Chin */}
      <mesh ref={jawRef} position={[0, -0.6, 0.5]} scale={[0.7, 0.5, 0.6]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>
      
      {/* Ears */}
      <mesh position={[-0.85, 0, 0.2]} rotation={[0, 0.5, 0]} scale={[0.3, 0.4, 0.2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.65} />
      </mesh>
      <mesh position={[0.85, 0, 0.2]} rotation={[0, -0.5, 0]} scale={[0.3, 0.4, 0.2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.65} />
      </mesh>
      
      {/* Hair - Professional style */}
      <mesh position={[0, 0.5, 0]} scale={[1.05, 0.7, 1.05]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={hairColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.7, -0.2]} scale={[0.9, 0.5, 0.8]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={hairColor} roughness={0.85} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, -1.1, 0]} scale={[0.35, 0.5, 0.35]}>
        <cylinderGeometry args={[1, 1, 1, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>
      
      {/* Collar (professional attire) */}
      <mesh position={[0, -1.45, 0]} scale={[0.5, 0.15, 0.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.3} />
      </mesh>
      
      {/* Glow effect when speaking */}
      {isSpeaking && (
        <>
          <pointLight
            position={[0, -0.4, 1.2]}
            intensity={1.2}
            color="#6ea8ff"
            distance={3}
          />
          <pointLight
            position={[0, 0, 2]}
            intensity={0.8}
            color="#4a90e2"
            distance={4}
          />
        </>
      )}
      
      {/* Rim light when active */}
      {isActive && (
        <pointLight
          position={[0, 1, -1]}
          intensity={0.5}
          color="#ffffff"
          distance={3}
        />
      )}
    </group>
  );
}

interface RealisticAvatarProps {
  isActive: boolean;
  isSpeaking: boolean;
  avatarType?: 'consultant' | 'partner';
  className?: string;
}

// Proactive WebGL capability detection
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    return !!gl;
  } catch (e) {
    return false;
  }
}

export default function RealisticAvatar({ 
  isActive, 
  isSpeaking, 
  avatarType = 'consultant',
  className = '' 
}: RealisticAvatarProps) {
  // Check WebGL availability before attempting to render Canvas
  const webglSupported = isWebGLAvailable();

  // If WebGL is not supported, show fallback immediately
  if (!webglSupported) {
    console.warn('[RealisticAvatar] WebGL not available, showing fallback');
    return <WebGLFallback />;
  }

  return (
    <div className={`${className}`} data-testid="realistic-avatar-scene">
      <Canvas
        camera={{ position: [0, 0.3, 3.5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting setup for realistic faces */}
        <ambientLight intensity={0.4} />
        
        {/* Key light (main) */}
        <directionalLight
          position={[2, 3, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Fill light */}
        <pointLight position={[-2, 1, 3]} intensity={0.6} color="#f0e4d7" />
        
        {/* Back light */}
        <pointLight position={[0, 2, -2]} intensity={0.4} color="#a8c5dd" />
        
        {/* Avatar Model */}
        <RealisticAvatarModel 
          isActive={isActive} 
          isSpeaking={isSpeaking}
          avatarType={avatarType}
        />
        
        {/* Environment for realistic reflections */}
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
