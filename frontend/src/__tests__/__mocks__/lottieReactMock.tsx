import React from 'react';

// Mock lottie-react for Jest
function MockLottie({
  animationData,
  loop,
  autoplay,
  style,
  onComplete,
  onLoopComplete,
}: {
  animationData: object;
  loop: boolean;
  autoplay: boolean;
  style?: React.CSSProperties;
  onComplete?: () => void;
  onLoopComplete?: () => void;
}) {
  // Trigger onComplete after a timeout to simulate animation ending
  React.useEffect(() => {
    if (autoplay && !loop && onComplete) {
      const timer = setTimeout(onComplete, 100);
      return () => clearTimeout(timer);
    }
  }, [autoplay, loop, onComplete]);

  return (
    <div
      data-testid="lottie-animation"
      data-loop={loop}
      data-autoplay={autoplay}
      style={style}
    >
      Mock Lottie Animation
    </div>
  );
}

export default MockLottie;
