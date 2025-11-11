import consultantImage from '@assets/stock_images/professional_busines_35704b64.jpg';
import partnerImage from '@assets/stock_images/older_european_femal_6cfda77f.jpg';

interface ProfessionalAvatarFallbackProps {
  avatarType?: 'consultant' | 'partner';
  className?: string;
}

export function ProfessionalAvatarFallback({ 
  avatarType = 'consultant',
  className = '' 
}: ProfessionalAvatarFallbackProps) {
  const image = avatarType === 'consultant' ? consultantImage : partnerImage;
  const altText = avatarType === 'consultant' ? 'Consultant' : 'Partner';

  return (
    <div className={`${className} w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg overflow-hidden`}>
      <img 
        src={image} 
        alt={`${altText} Avatar`}
        className="w-full h-full object-cover"
        data-testid={`avatar-fallback-${avatarType}`}
      />
    </div>
  );
}
