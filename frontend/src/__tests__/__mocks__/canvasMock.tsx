import React from 'react';

// Mock canvas components for Jest
export const CanvasContainer = React.forwardRef(({ children, ...props }: any, ref) => (
  <div data-testid="mock-canvas-container" ref={ref as any} {...props}>
    {children}
  </div>
));
CanvasContainer.displayName = 'MockCanvasContainer';

export const useAnimationLoop = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: false,
});

export const ConfettiCelebration = ({ ...props }: any) => (
  <div data-testid="mock-confetti" {...props}>Mock Confetti</div>
);

export const ParticleSystem = () => null;

export const FlowParticleOverlay = React.forwardRef(({ ...props }: any, ref) => (
  <div data-testid="mock-flow-overlay" ref={ref as any} {...props}>Mock Flow Overlay</div>
));
FlowParticleOverlay.displayName = 'MockFlowParticleOverlay';

export const EngagementNetwork = React.forwardRef(({ ...props }: any, ref) => (
  <div data-testid="mock-engagement-network" ref={ref as any} {...props}>Mock Engagement Network</div>
));
EngagementNetwork.displayName = 'MockEngagementNetwork';

export const PostDensityMap = React.forwardRef(({ ...props }: any, ref) => (
  <div data-testid="mock-post-density-map" ref={ref as any} {...props}>Mock Post Density Map</div>
));
PostDensityMap.displayName = 'MockPostDensityMap';

// Export types as empty interfaces (they'll be satisfied by any object)
export interface CanvasContainerProps {}
export interface CanvasContainerRef {}
export interface AnimationLoopOptions {}
export interface AnimationLoopControls {}
export interface ConfettiCelebrationProps {}
export interface Particle {}
export interface ParticleConfig {}
export interface BaseEmitterConfig {}
export interface EmitterConfig {}
export interface BurstConfig {}
export interface FlowParticleOverlayProps {}
export interface FlowParticleOverlayRef {}
export interface FlowEdge {}
export interface FlowParticle {}
export interface EngagementNetworkProps {}
export interface EngagementNetworkRef {}
export interface NetworkNode {}
export interface NetworkLink {}
export interface PostDensityMapProps {}
export interface PostDensityMapRef {}
export interface PostDataPoint {}
