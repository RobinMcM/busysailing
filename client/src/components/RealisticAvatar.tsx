import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { ProfessionalAvatarFallback } from './ProfessionalAvatarFallback';

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
  className = ''
}: RealisticAvatarProps) {
  const [glbExists, setGlbExists] = useState<boolean>(false);
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  
  // Check WebGL availability
  const webglSupported = isWebGLAvailable();

  // Determine which GLB model to use
  const modelPath = `/avatars/${avatarType}.glb`;

  // Check if GLB file exists on mount
  useEffect(() => {
    checkGLBExists(modelPath).then((exists) => {
      console.log(`[RealisticAvatar] GLB file ${modelPath} exists:`, exists);
      setGlbExists(exists);
      setHasChecked(true);
      if (!exists) {
        console.warn(`[RealisticAvatar] GLB file not found at ${modelPath}, using fallback photo`);
      }
    });
  }, [modelPath]);

  // Always show fallback for now (until user adds GLB files)
  // Conditions: WebGL not supported, GLB doesn't exist, or still checking
  if (!webglSupported || !glbExists || !hasChecked) {
    return <ProfessionalAvatarFallback avatarType={avatarType} className={className} />;
  }

  // Note: Once user adds GLB files, the system will detect them and render 3D avatars
  // For now, this code path won't execute until GLB files are present
  return <ProfessionalAvatarFallback avatarType={avatarType} className={className} />;
}
