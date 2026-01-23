declare module 'lottie-react' {
  import { ComponentType, RefObject } from 'react';

  export interface LottieOptions {
    animationData: unknown;
    loop?: boolean;
    autoplay?: boolean;
    initialSegment?: [number, number];
    onComplete?: () => void;
    onLoopComplete?: () => void;
    onEnterFrame?: () => void;
    onSegmentStart?: () => void;
    style?: React.CSSProperties;
    className?: string;
    rendererSettings?: {
      preserveAspectRatio?: string;
      progressiveLoad?: boolean;
      hideOnTransparent?: boolean;
      className?: string;
    };
  }

  export interface LottieRefCurrentProps {
    play: () => void;
    pause: () => void;
    stop: () => void;
    setSpeed: (speed: number) => void;
    goToAndPlay: (frame: number, isFrame?: boolean) => void;
    goToAndStop: (frame: number, isFrame?: boolean) => void;
    setDirection: (direction: 1 | -1) => void;
    getDuration: (inFrames?: boolean) => number;
    destroy: () => void;
  }

  export function useLottie(
    options: LottieOptions,
    style?: React.CSSProperties
  ): {
    View: JSX.Element;
    play: () => void;
    pause: () => void;
    stop: () => void;
    setSpeed: (speed: number) => void;
    goToAndPlay: (frame: number, isFrame?: boolean) => void;
    goToAndStop: (frame: number, isFrame?: boolean) => void;
    setDirection: (direction: 1 | -1) => void;
  };

  export function useLottieInteractivity(options: {
    lottieObj: ReturnType<typeof useLottie>;
    mode: 'scroll' | 'cursor';
    actions: Array<{
      visibility?: [number, number];
      type: 'seek' | 'play' | 'stop' | 'loop';
      frames?: [number, number];
    }>;
  }): JSX.Element;

  const Lottie: ComponentType<
    LottieOptions & {
      lottieRef?: RefObject<LottieRefCurrentProps>;
    }
  >;

  export default Lottie;
}
