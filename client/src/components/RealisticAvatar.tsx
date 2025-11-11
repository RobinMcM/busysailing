import { ProfessionalAvatarFallback } from './ProfessionalAvatarFallback';

interface RealisticAvatarProps {
  isActive: boolean;
  isSpeaking: boolean;
  avatarType?: 'consultant' | 'partner';
  className?: string;
  audioElement?: HTMLAudioElement | null;
}

export default function RealisticAvatar({ 
  isActive, 
  isSpeaking, 
  avatarType = 'consultant',
  className = '',
  audioElement
}: RealisticAvatarProps) {
  return <ProfessionalAvatarFallback avatarType={avatarType} className={className} />;
}
