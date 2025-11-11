import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { ProfessionalAvatarFallback } from './ProfessionalAvatarFallback';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { GLBAvatarModel } from './GLBAvatarModel';

interface RealisticAvatarProps {
  isActive: boolean;
  isSpeaking: boolean;
  avatarType?: 'consultant' | 'partner';
  className?: string;
  audioElement?: HTMLAudioElement | null;
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
  className = '',
  audioElement
}: RealisticAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Check WebGL availability before attempting to render Canvas
  const webglSupported = isWebGLAvailable();

  // Handle WebGL context loss per-canvas
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('[RealisticAvatar] WebGL context lost, showing fallback');
      setHasError(true);
    };

    const handleContextRestored = () => {
      console.log('[RealisticAvatar] WebGL context restored');
      setHasError(false);
    };

    // Get canvas from Canvas component after it mounts
    const checkCanvas = setInterval(() => {
      const canvas = document.querySelector('[data-testid="realistic-avatar-scene"] canvas');
      if (canvas && canvas !== canvasRef.current) {
        canvasRef.current = canvas as HTMLCanvasElement;
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
        clearInterval(checkCanvas);
      }
    }, 100);

    return () => {
      clearInterval(checkCanvas);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('webglcontextlost', handleContextLost);
        canvasRef.current.removeEventListener('webglcontextrestored', handleContextRestored);
      }
    };
  }, []);

  // Determine which GLB model to use
  const modelPath = `/avatars/${avatarType}.glb`;

  // If WebGL is not supported, model failed to load, or error occurred, show professional fallback
  if (!webglSupported || hasError || (!modelLoaded && hasError)) {
    return <ProfessionalAvatarFallback avatarType={avatarType} className={className} />;
  }

  return (
    <CanvasErrorBoundary
      fallback={<ProfessionalAvatarFallback avatarType={avatarType} className={className} />}
      onError={() => {
        console.warn('[RealisticAvatar] ErrorBoundary caught rendering error, switching to fallback');
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
          {/* Lighting setup for realistic faces */}
          <ambientLight intensity={0.6} />
          
          {/* Key light (main) */}
          <directionalLight
            position={[2, 3, 4]}
            intensity={1.0}
          />
          
          {/* Fill light */}
          <pointLight position={[-2, 1, 3]} intensity={0.5} color="#f0e4d7" />
          
          {/* Back light */}
          <pointLight position={[0, 2, -2]} intensity={0.3} color="#a8c5dd" />
          
          {/* GLB Avatar Model */}
          <GLBAvatarModel
            modelPath={modelPath}
            isActive={isActive}
            isSpeaking={isSpeaking}
            audioElement={audioElement}
          />
          
          {/* Environment for realistic reflections */}
          <Environment preset="studio" />
          
          {/* Optional: Allow user to rotate view */}
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
