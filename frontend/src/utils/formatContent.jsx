import { CheckCircle } from 'lucide-react';

/**
 * Format CMS content with proper bullet points and line breaks
 * Recognizes · • - as bullet markers and renders them as styled lists
 * 
 * @param {string} text - The raw text content from CMS
 * @param {string} accentColor - Color for checkmarks: 'red', 'sky', 'emerald' (default: 'red')
 * @returns {JSX.Element|null} Formatted content with proper styling
 */
export const formatContent = (text, accentColor = 'red') => {
  if (!text) return null;
  
  // Color mapping for checkmarks
  const colorClasses = {
    red: 'text-red-500',
    sky: 'text-sky-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500'
  };
  
  const checkColor = colorClasses[accentColor] || colorClasses.red;
  
  // Split by line breaks
  const lines = text.split('\n').filter(line => line.trim());
  
  // Check if content has bullet points (starts with · or - or •)
  const hasBullets = lines.some(line => /^[\s]*[·•\-]/.test(line));
  
  if (hasBullets) {
    // Separate intro text from bullet points
    const introLines = [];
    const bulletLines = [];
    let foundBullet = false;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (/^[·•\-]/.test(trimmed)) {
        foundBullet = true;
        // Remove the bullet character and clean up
        bulletLines.push(trimmed.replace(/^[·•\-]\s*/, ''));
      } else if (!foundBullet) {
        introLines.push(trimmed);
      } else {
        // Line after bullets without bullet - could be continuation
        if (bulletLines.length > 0) {
          bulletLines[bulletLines.length - 1] += ' ' + trimmed;
        }
      }
    });
    
    return (
      <div className="space-y-4">
        {introLines.length > 0 && (
          <p className="text-lg text-slate-600">{introLines.join(' ')}</p>
        )}
        {bulletLines.length > 0 && (
          <ul className="space-y-3">
            {bulletLines.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className={`w-5 h-5 ${checkColor} mt-0.5 shrink-0`} />
                <span className="text-slate-600">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  
  // No bullets - just preserve line breaks
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <p key={index} className="text-lg text-slate-600">{line}</p>
      ))}
    </div>
  );
};

export default formatContent;
