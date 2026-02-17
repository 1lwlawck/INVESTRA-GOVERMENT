// Government Official Garuda Emblem
export function GarudaEmblem({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M60 15 L95 35 L95 75 L60 105 L25 75 L25 35 Z" fill="#C41E3A" stroke="#8B0000" strokeWidth="2" />
      <line x1="60" y1="15" x2="60" y2="105" stroke="#333" strokeWidth="1.5" />
      <line x1="25" y1="55" x2="95" y2="55" stroke="#333" strokeWidth="1.5" />
      <polygon points="60,22 63,30 72,30 65,35 68,43 60,38 52,43 55,35 48,30 57,30" fill="#F9B233" stroke="#CC8400" strokeWidth="0.5" />
      <circle cx="42" cy="40" r="5" fill="#333" />
      <path d="M37 38 Q42 32 47 38" stroke="#333" strokeWidth="2" fill="none" />
      <line x1="78" y1="48" x2="78" y2="38" stroke="#2D5016" strokeWidth="2" />
      <ellipse cx="78" cy="36" rx="8" ry="6" fill="#2D5016" opacity="0.8" />
      <circle cx="78" cy="65" r="3" fill="none" stroke="#F9B233" strokeWidth="1.5" />
      <circle cx="78" cy="73" r="3" fill="none" stroke="#F9B233" strokeWidth="1.5" />
      <circle cx="78" cy="81" r="3" fill="none" stroke="#F9B233" strokeWidth="1.5" />
      <path d="M38 60 Q42 70 38 80" stroke="#2D5016" strokeWidth="1.5" fill="none" />
      <path d="M42 60 Q46 70 42 80" stroke="#2D5016" strokeWidth="1.5" fill="none" />
      <ellipse cx="38" cy="60" rx="2" ry="3" fill="#F9B233" opacity="0.8" />
      <ellipse cx="42" cy="62" rx="2" ry="3" fill="#FFFFFF" />
      <path d="M25 35 L15 25 L20 35" fill="#F9B233" stroke="#CC8400" strokeWidth="0.5" />
      <path d="M95 35 L105 25 L100 35" fill="#F9B233" stroke="#CC8400" strokeWidth="0.5" />
      <path d="M50 90 L55 85 L60 90 L65 85 L70 90" stroke="#F9B233" strokeWidth="2" fill="none" />
      <path d="M55 105 L58 110 L60 105 L62 110 L64 105" stroke="#F9B233" strokeWidth="1.5" fill="none" />
      <path d="M30 95 Q60 88 90 95" fill="#FFFFFF" stroke="#333" strokeWidth="1" />
      <text x="60" y="98" textAnchor="middle" fontSize="5" fill="#333" fontWeight="bold">BHINNEKA TUNGGAL IKA</text>
    </svg>
  );
}
