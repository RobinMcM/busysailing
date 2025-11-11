import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { ProfessionalAvatarFallback } from './ProfessionalAvatarFallback';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import * as THREE from 'three';

interface RealisticAvatarProps {
  isActive: boolean;
  isSpeaking: boolean;
  avatarType?: 'consultant' | 'partner';
  className?: string;
  audioElement?: HTMLAudioElement | null;
}

// Animated GLB model component with fixed audio handling
function AnimatedGLBModel({ 
  modelPath,
  isSpeaking,
  audioElement 
}: { 
  modelPath: string;
  isSpeaking: boolean;
  audioElement?: HTMLAudioElement | null;
}) {
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array>(new Uint8Array(128));

  // Set up persistent audio analyzer (only once per audioElement)
  useEffect(() => {
    if (!audioElement) return;

    // Only create if we don't have one yet
    if (!audioContextRef.current) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audioElement);
        const analyzer = audioContext.createAnalyser();
        
        analyzer.fftSize = 256;
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
        audioDataRef.current = new Uint8Array(analyzer.frequencyBinCount);
        
        console.log('[AnimatedGLBModel] Audio analyzer created');
      } catch (error) {
        console.warn('[AnimatedGLBModel] Audio analyzer setup failed:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.warn);
        audioContextRef.current = null;
        analyzerRef.current = null;
      }
    };
  }, [audioElement]); // Only depend on audioElement, not isSpeaking

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Subtle idle head movement
    groupRef.current.position.y = Math.sin(time * 0.6) * 0.02;
    groupRef.current.rotation.y = Math.sin(time * 0.4) * 0.05;
    groupRef.current.rotation.x = Math.sin(time * 0.5) * 0.03;
    
    // Audio-driven lip-sync (when speaking)
    if (isSpeaking && analyzerRef.current && audioDataRef.current) {
      analyzerRef.current.getByteFrequencyData(audioDataRef.current);
      
      const speechRange = audioDataRef.current.slice(0, 32);
      const averageVolume = speechRange.reduce((a, b) => a + b, 0) / speechRange.length;
      const normalizedVolume = averageVolume / 255;
      
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
          const morphDict = child.morphTargetDictionary;
          if (morphDict) {
            const jawIndex = morphDict['jawOpen'] || morphDict['JawOpen'] || morphDict['mouthOpen'];
            if (jawIndex !== undefined) {
              child.morphTargetInfluences[jawIndex] = normalizedVolume * 0.8;
            }
          }
        }
      });
    } else {
      // Close mouth when not speaking
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
          const morphDict = child.morphTargetDictionary;
          if (morphDict) {
            const jawIndex = morphDict['jawOpen'] || morphDict['JawOpen'] || morphDict['mouthOpen'];
            if (jawIndex !== undefined) {
              child.morphTargetInfluences[jawIndex] = 0;
            }
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
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

// Check if GLB file exists
async function checkGLBExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export default function RealisticAvatar({ 
  isActive, 
  isSpeaking, 
  avatarType = 'consultant',
  className = '',
  audioElement
}: RealisticAvatarProps) {
  const [glbExists, setGlbExists] = useState<boolean | null>(null);
  const [hasError, setHasError] = useState(false);
  
  const webglSupported = isWebGLAvailable();
  const modelPath = `/avatars/${avatarType}.glb`;

  // Check if GLB file exists on mount
  useEffect(() => {
    checkGLBExists(modelPath).then((exists) => {
      console.log(`[RealisticAvatar] GLB file ${modelPath} exists:`, exists);
      setGlbExists(exists);
      if (!exists) {
        console.warn(`[RealisticAvatar] GLB file not found at ${modelPath}, using fallback photo`);
      }
    });
  }, [modelPath]);

  // Show fallback if: WebGL not supported, GLB doesn't exist, still checking, or error occurred
  if (!webglSupported || glbExists === false || glbExists === null || hasError) {
    return <ProfessionalAvatarFallback avatarType={avatarType} className={className} />;
  }

  // Render 3D avatar when GLB exists and WebGL supported
  return (
    <CanvasErrorBoundary
      fallback={<ProfessionalAvatarFallback avatarType={avatarType} className={className} />}
      onError={() => {
        console.warn('[RealisticAvatar] ErrorBoundary caught error, switching to fallback');
        setHasError(true);
      }}
    >
      <div className={`${className}`} data-testid="realistic-avatar-scene">
        <Canvas
          camera={{ position: [0, 0.5, 2], fov: 50 }}
          shadows={false}
          gl={{ 
            antialias: false,
            alpha: true,
            powerPreference: 'low-power'
          }}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 4]} intensity={1.0} />
          <pointLight position={[-2, 1, 3]} intensity={0.5} color="#f0e4d7" />
          <pointLight position={[0, 2, -2]} intensity={0.3} color="#a8c5dd" />
          
          <AnimatedGLBModel 
            modelPath={modelPath}
            isSpeaking={isSpeaking}
            audioElement={audioElement}
          />
          
          <Environment preset="studio" />
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2.5}
          />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}

// Preload GLB files to improve loading time
if (typeof window !== 'undefined') {
  useGLTF.preload('/avatars/consultant.glb');
  useGLTF.preload('/avatars/partner.glb');
}
