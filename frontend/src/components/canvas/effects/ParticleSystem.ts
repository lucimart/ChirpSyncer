/**
 * Lightweight particle system for Canvas 2D animations
 * Optimized with object pooling to minimize GC
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'square' | 'triangle' | 'star';
  active: boolean;
}

export interface ParticleConfig {
  /** Starting X position */
  x: number;
  /** Starting Y position */
  y: number;
  /** Initial horizontal velocity */
  vx?: number;
  /** Initial vertical velocity */
  vy?: number;
  /** Particle size in pixels */
  size?: number;
  /** CSS color string */
  color?: string;
  /** Initial opacity (0-1) */
  alpha?: number;
  /** Rotation in radians */
  rotation?: number;
  /** Rotation speed in radians/frame */
  rotationSpeed?: number;
  /** Lifetime in milliseconds */
  life?: number;
  /** Shape type */
  shape?: Particle['shape'];
}

/** Base configuration for particle emission (used by burst) */
export interface BaseEmitterConfig {
  /** Emission position X */
  x: number;
  /** Emission position Y */
  y: number;
  /** Spread angle in radians (0 = straight up, PI = all directions) */
  spread?: number;
  /** Base angle in radians (0 = right, PI/2 = down) */
  angle?: number;
  /** Min/max initial speed */
  speed?: { min: number; max: number };
  /** Min/max size */
  size?: { min: number; max: number };
  /** Min/max lifetime in ms */
  life?: { min: number; max: number };
  /** Color palette */
  colors?: string[];
  /** Gravity force (positive = down) */
  gravity?: number;
  /** Air resistance (0-1, higher = more drag) */
  drag?: number;
  /** Shapes to use */
  shapes?: Particle['shape'][];
}

/** Configuration for continuous emitters (requires rate) */
export interface EmitterConfig extends BaseEmitterConfig {
  /** Particles to emit per second */
  rate: number;
}

/** Configuration for burst emission */
export interface BurstConfig extends BaseEmitterConfig {
  /** Number of particles to emit */
  count: number;
}

const DEFAULT_COLORS = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#45B7D1', // blue
  '#96CEB4', // green
  '#FFEAA7', // yellow
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#F7DC6F', // gold
];

/**
 * Particle pool for object reuse
 */
class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];

  acquire(config: ParticleConfig): Particle {
    let particle = this.pool.pop();

    if (!particle) {
      particle = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 10,
        color: '#fff',
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
        life: 1000,
        maxLife: 1000,
        shape: 'circle',
        active: true,
      };
    }

    // Reset with config
    particle.x = config.x;
    particle.y = config.y;
    particle.vx = config.vx ?? 0;
    particle.vy = config.vy ?? 0;
    particle.size = config.size ?? 10;
    particle.color = config.color ?? '#fff';
    particle.alpha = config.alpha ?? 1;
    particle.rotation = config.rotation ?? 0;
    particle.rotationSpeed = config.rotationSpeed ?? 0;
    particle.life = config.life ?? 1000;
    particle.maxLife = config.life ?? 1000;
    particle.shape = config.shape ?? 'circle';
    particle.active = true;

    this.active.push(particle);
    return particle;
  }

  release(particle: Particle): void {
    particle.active = false;
    const index = this.active.indexOf(particle);
    if (index !== -1) {
      this.active.splice(index, 1);
    }
    this.pool.push(particle);
  }

  getActive(): Particle[] {
    return this.active;
  }

  clear(): void {
    this.pool.push(...this.active);
    this.active.forEach((p) => (p.active = false));
    this.active = [];
  }
}

/**
 * Particle system for managing and rendering particles
 */
export class ParticleSystem {
  private pool = new ParticlePool();
  private emitters: Map<string, { config: EmitterConfig; accumulator: number }> = new Map();
  private gravity: number;
  private drag: number;

  constructor(options: { gravity?: number; drag?: number } = {}) {
    this.gravity = options.gravity ?? 0.1;
    this.drag = options.drag ?? 0.01;
  }

  /**
   * Add an emitter that continuously spawns particles
   */
  addEmitter(id: string, config: EmitterConfig): void {
    this.emitters.set(id, { config, accumulator: 0 });
  }

  /**
   * Remove an emitter
   */
  removeEmitter(id: string): void {
    this.emitters.delete(id);
  }

  /**
   * Emit a burst of particles at once
   */
  burst(config: BurstConfig): void {
    const { count, ...emitterConfig } = config;
    for (let i = 0; i < count; i++) {
      this.emitParticle(emitterConfig);
    }
  }

  /**
   * Emit a single particle from an emitter config
   */
  private emitParticle(config: BaseEmitterConfig): void {
    const {
      x,
      y,
      spread = Math.PI * 2,
      angle = -Math.PI / 2, // Default: up
      speed = { min: 2, max: 8 },
      size = { min: 5, max: 15 },
      life = { min: 500, max: 1500 },
      colors = DEFAULT_COLORS,
      shapes = ['circle', 'square'],
    } = config;

    // Random angle within spread
    const particleAngle = angle + (Math.random() - 0.5) * spread;

    // Random speed
    const particleSpeed = speed.min + Math.random() * (speed.max - speed.min);

    // Calculate velocity
    const vx = Math.cos(particleAngle) * particleSpeed;
    const vy = Math.sin(particleAngle) * particleSpeed;

    // Random properties
    const particleSize = size.min + Math.random() * (size.max - size.min);
    const particleLife = life.min + Math.random() * (life.max - life.min);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    this.pool.acquire({
      x,
      y,
      vx,
      vy,
      size: particleSize,
      color,
      life: particleLife,
      shape,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  /**
   * Update all particles (call once per frame)
   */
  update(deltaTime: number): void {
    const dt = deltaTime / 16.67; // Normalize to ~60fps

    // Update emitters
    for (const [, emitter] of this.emitters) {
      emitter.accumulator += deltaTime;
      const interval = 1000 / emitter.config.rate;

      while (emitter.accumulator >= interval) {
        this.emitParticle(emitter.config);
        emitter.accumulator -= interval;
      }
    }

    // Update particles
    const particles = this.pool.getActive();
    const toRelease: Particle[] = [];

    for (const p of particles) {
      // Apply physics
      p.vy += (this.emitters.get('')?.config.gravity ?? this.gravity) * dt;
      p.vx *= 1 - this.drag;
      p.vy *= 1 - this.drag;

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Update rotation
      p.rotation += p.rotationSpeed * dt;

      // Update life
      p.life -= deltaTime;

      // Fade out as life decreases
      p.alpha = Math.max(0, p.life / p.maxLife);

      // Mark dead particles
      if (p.life <= 0) {
        toRelease.push(p);
      }
    }

    // Release dead particles
    for (const p of toRelease) {
      this.pool.release(p);
    }
  }

  /**
   * Draw all particles to canvas
   */
  draw(ctx: CanvasRenderingContext2D): void {
    const particles = this.pool.getActive();

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.fillStyle = p.color;

      switch (p.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'square':
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;

        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
          break;

        case 'star':
          this.drawStar(ctx, 0, 0, 5, p.size / 2, p.size / 4);
          break;
      }

      ctx.restore();
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Get active particle count
   */
  getParticleCount(): number {
    return this.pool.getActive().length;
  }

  /**
   * Check if any particles are active
   */
  isActive(): boolean {
    return this.pool.getActive().length > 0 || this.emitters.size > 0;
  }

  /**
   * Clear all particles and emitters
   */
  clear(): void {
    this.pool.clear();
    this.emitters.clear();
  }
}

export default ParticleSystem;
