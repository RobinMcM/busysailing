import consultantImage from '@assets/generated_images/Video_call_tax_advisor_3ce91073.png';
import partnerImage from '@assets/generated_images/Older_European_female_advisor_portrait_b60fd6fc.png';

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
    <div className={`${className} w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-full overflow-hidden`}>
      <img 
        src={image} 
        alt={`${altText} Avatar`}
        className="w-full h-full object-cover"
        data-testid={`avatar-fallback-${avatarType}`}
      />
    </div>
  );
}
