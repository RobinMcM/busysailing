import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface GLBAvatarModelProps {
  modelPath: string;
  isActive: boolean;
  isSpeaking: boolean;
  audioElement?: HTMLAudioElement | null;
}

export function GLBAvatarModel({ 
  modelPath, 
  isActive, 
  isSpeaking,
  audioElement 
}: GLBAvatarModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [audioAnalyzer, setAudioAnalyzer] = useState<AnalyserNode | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(128));
  
  // Load the GLB model
  const { scene, animations } = useGLTF(modelPath);
  
  // Set up audio analyzer for lip-sync
  useEffect(() => {
    if (!audioElement || !isSpeaking) {
      setAudioAnalyzer(null);
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioElement);
      const analyzer = audioContext.createAnalyser();
      
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzer.connect(audioContext.destination);
      
      setAudioAnalyzer(analyzer);
      setAudioData(new Uint8Array(analyzer.frequencyBinCount));
    } catch (error) {
      console.warn('[GLBAvatar] Audio analyzer setup failed:', error);
    }
  }, [audioElement, isSpeaking]);
  
  // Set up animation mixer for blend shapes/morph targets
  useEffect(() => {
    if (!scene) return;
    
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(scene);
      mixerRef.current = mixer;
      
      // Play idle animations if available
      animations.forEach((clip) => {
        if (clip.name.toLowerCase().includes('idle')) {
          const action = mixer.clipAction(clip);
          action.play();
        }
      });
    }
    
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [scene, animations]);
  
  // Animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    
    // Subtle idle head movement
    const time = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(time * 0.6) * 0.02;
    groupRef.current.rotation.y = Math.sin(time * 0.4) * 0.05;
    groupRef.current.rotation.x = Math.sin(time * 0.5) * 0.03;
    
    // Audio-driven lip-sync
    if (isSpeaking && audioAnalyzer && audioData) {
      audioAnalyzer.getByteFrequencyData(audioData);
      
      // Get average volume from low-mid frequencies (speech range)
      const speechRange = audioData.slice(0, 32);
      const averageVolume = speechRange.reduce((a, b) => a + b, 0) / speechRange.length;
      const normalizedVolume = averageVolume / 255;
      
      // Find mesh with morph targets (jaw/mouth)
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
          // Look for common morph target names
          const morphDict = child.morphTargetDictionary;
          
          if (morphDict) {
            // Try to find jaw/mouth morph targets
            const jawIndex = morphDict['jawOpen'] || morphDict['JawOpen'] || morphDict['mouthOpen'];
            
            if (jawIndex !== undefined) {
              // Animate jaw based on audio volume
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
    
    // Blinking animation
    if (Math.random() < 0.01) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
          const morphDict = child.morphTargetDictionary;
          if (morphDict) {
            const blinkIndex = morphDict['eyesClosed'] || morphDict['blink'];
            if (blinkIndex !== undefined) {
              // Quick blink
              child.morphTargetInfluences[blinkIndex] = 1;
              setTimeout(() => {
                if (child.morphTargetInfluences) {
                  child.morphTargetInfluences[blinkIndex] = 0;
                }
              }, 150);
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

// Preload models
useGLTF.preload('/avatars/consultant.glb');
useGLTF.preload('/avatars/partner.glb');
