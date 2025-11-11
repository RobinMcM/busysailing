import { useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface SafeGLBAvatarLoaderProps {
  modelPath: string;
  onLoadSuccess: () => void;
  onLoadError: (error: Error) => void;
  children: (scene: THREE.Group) => React.ReactNode;
}

export function SafeGLBAvatarLoader({ 
  modelPath, 
  onLoadSuccess, 
  onLoadError,
  children 
}: SafeGLBAvatarLoaderProps) {
  const [hasLoaded, setHasLoaded] = useState(false);

  try {
    const { scene } = useGLTF(modelPath);
    
    useEffect(() => {
      if (scene && !hasLoaded) {
        console.log('[SafeGLBAvatarLoader] GLB loaded successfully');
        setHasLoaded(true);
        onLoadSuccess();
      }
    }, [scene, hasLoaded, onLoadSuccess]);

    return <>{children(scene)}</>;
  } catch (error) {
    console.error('[SafeGLBAvatarLoader] GLB load failed:', error);
    onLoadError(error as Error);
    return null;
  }
}
