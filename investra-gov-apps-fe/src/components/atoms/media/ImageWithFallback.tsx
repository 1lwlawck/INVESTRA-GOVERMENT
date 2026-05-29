import React, { useRef, useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc = '/placeholder.svg',
  alt,
  className,
  width,
  height,
}) => {
  // Track which source is currently shown. We can't derive this from `src` alone
  // because we need to remember when we've already swapped to the fallback.
  const [currentSrc, setCurrentSrc] = useState(src);
  const hasErroredRef = useRef(false);

  // If the parent passes a new `src`, reset and try it again.
  if (src !== currentSrc && !hasErroredRef.current) {
    setCurrentSrc(src);
  }

  const handleError = () => {
    if (!hasErroredRef.current && fallbackSrc) {
      hasErroredRef.current = true;
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={handleError}
    />
  );
};
