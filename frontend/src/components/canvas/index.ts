// Core components
export {
  CanvasContainer,
  type CanvasContainerProps,
  type CanvasContainerRef,
  useAnimationLoop,
  type AnimationLoopOptions,
  type AnimationLoopControls,
} from './core';

// Effects
export {
  ConfettiCelebration,
  type ConfettiCelebrationProps,
  ParticleSystem,
  type Particle,
  type ParticleConfig,
  type BaseEmitterConfig,
  type EmitterConfig,
  type BurstConfig,
} from './effects';

// Visualizations
export {
  FlowParticleOverlay,
  type FlowParticleOverlayProps,
  type FlowParticleOverlayRef,
  type FlowEdge,
  type FlowParticle,
  EngagementNetwork,
  type EngagementNetworkProps,
  type EngagementNetworkRef,
  type NetworkNode,
  type NetworkLink,
  PostDensityMap,
  type PostDensityMapProps,
  type PostDensityMapRef,
  type PostDataPoint,
} from './visualizations';
