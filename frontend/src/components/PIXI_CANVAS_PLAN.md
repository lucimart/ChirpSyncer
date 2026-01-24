# Pixi.js / Canvas Integration Plan

## Resumen Ejecutivo

Plan de integración de Pixi.js y Canvas 2D para ChirpSyncer, enfocado en casos donde SVG/React tienen limitaciones de performance.

## Cuándo usar Canvas vs SVG

| Criterio | SVG (actual) | Canvas 2D | Pixi.js (WebGL) |
|----------|--------------|-----------|-----------------|
| Elementos | < 500 | 500 - 5,000 | 5,000+ |
| Animaciones continuas | ❌ Costoso | ✅ Óptimo | ✅ Óptimo |
| Interactividad | ✅ Nativo | ⚠️ Manual | ⚠️ Manual |
| Accesibilidad | ✅ DOM | ❌ Requiere ARIA | ❌ Requiere ARIA |
| Text rendering | ✅ Nítido | ⚠️ Borroso | ⚠️ Borroso |
| Shaders/Filters | ❌ | ❌ | ✅ |

---

## Casos de Uso Identificados

### 🔴 Alta Prioridad

#### 1. FlowDiagram Edges Animados
**Problema**: SVG stroke-dasharray animation en 5-10 edges causa re-renders continuos.

**Solución**: Canvas overlay para edges, mantener nodos en React.

```
┌─────────────────────────────────────────┐
│  React Layer (nodes, UI)                │
│  ┌─────────────────────────────────────┐│
│  │  Canvas Layer (animated edges)      ││
│  │  - Bezier curves                    ││
│  │  - Dash animation 60fps             ││
│  │  - Glow effects                     ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Beneficio**: 5-10x mejora en FPS para animaciones de sync.

**Componente**: `CanvasFlowEdges`

---

#### 2. Celebration Particles (Sync Complete)
**Trigger**: Cuando un sync termina exitosamente.

**Efecto**: Confetti/particles desde el nodo de sync.

```
┌─────────────────────────────────────────┐
│           🎉 🎊 ✨                       │
│         🎉   ✨   🎊                     │
│       ✨  [Sync Complete]  🎉            │
│         🎊   ✨   🎉                     │
│           ✨ 🎊 🎉                       │
└─────────────────────────────────────────┘
```

**Beneficio**: Feedback visual satisfactorio sin Lottie JSON pesado.

**Componente**: `ConfettiCelebration`

---

### 🟡 Media Prioridad

#### 3. Engagement Network Graph
**Caso**: Visualizar interacciones entre usuarios (quién responde a quién).

**Data**: 100-1000 nodos (usuarios), 500-5000 edges (interacciones).

```
        ○ user_a
       /|\
      / | \
     ○  ○  ○
    /|\ |  |\
   ○ ○ ○ ○ ○ ○
```

**Algoritmo**: Force-directed layout (D3-force + Pixi rendering).

**Interacción**:
- Hover nodo → highlight conexiones
- Click nodo → zoom + detalles
- Drag para explorar

**Componente**: `EngagementNetwork`

---

#### 4. Mass Post Visualization (10k+ posts)
**Caso**: Vista "bird's eye" de todos los posts del usuario.

**Representación**: Cada post = 1 pixel/pequeño rect coloreado por engagement.

```
┌─────────────────────────────────────────┐
│ ░░▓▓░░██░░▓▓░░██░░▓▓░░██░░▓▓░░██░░▓▓░░ │
│ ▓▓░░██░░▓▓░░██░░▓▓░░██░░▓▓░░██░░▓▓░░██ │
│ ░░▓▓░░██░░▓▓░░██░░▓▓░░██░░▓▓░░██░░▓▓░░ │
│ Timeline ────────────────────────────▶ │
└─────────────────────────────────────────┘
  Legend: ░ low  ▓ medium  █ high engagement
```

**Interacción**:
- Brush selection → filtrar rango de tiempo
- Hover → tooltip con post preview
- Zoom → transición a vista detallada

**Componente**: `PostDensityMap`

---

#### 5. Real-time Sync Visualizer
**Caso**: Mostrar posts fluyendo entre plataformas durante sync activo.

```
  Twitter                          Bluesky
    │                                │
    │  ┌──────┐      ┌──────┐       │
    ├──│ Post │─────▶│ Post │───────┤
    │  └──────┘      └──────┘       │
    │       ┌──────┐                │
    │◀──────│ Post │────────────────┤
    │       └──────┘                │
```

**Animación**: Posts como partículas moviéndose entre plataformas.

**Componente**: `LiveSyncFlow`

---

### 🟠 Baja Prioridad

#### 6. Heatmap con Canvas
**Mejora**: D3TimingHeatmap actual (168 celdas SVG) → Canvas.

**Beneficio**: Hover más fluido, transiciones de color GPU-accelerated.

**Componente**: `CanvasTimingHeatmap`

---

#### 7. Word Cloud de Hashtags
**Caso**: Visualizar hashtags más usados.

**Algoritmo**: Spiral placement con collision detection.

**Componente**: `HashtagCloud`

---

## Arquitectura Técnica

### Estructura de Directorios

```
src/components/canvas/
├── core/
│   ├── CanvasContainer.tsx      # React wrapper con resize observer
│   ├── PixiContainer.tsx        # Pixi.js React integration
│   ├── useCanvasRenderer.ts     # Hook para 2D context
│   ├── usePixiApp.ts            # Hook para Pixi Application
│   └── useAnimationLoop.ts      # requestAnimationFrame manager
│
├── effects/
│   ├── ConfettiCelebration.tsx  # Particle celebration
│   ├── ParticleEmitter.ts       # Generic particle system
│   └── GlowEffect.ts            # Pixi filters
│
├── visualizations/
│   ├── CanvasFlowEdges.tsx      # Animated bezier edges
│   ├── EngagementNetwork.tsx    # Force-directed graph
│   ├── PostDensityMap.tsx       # 10k+ post overview
│   ├── LiveSyncFlow.tsx         # Real-time sync particles
│   └── CanvasTimingHeatmap.tsx  # Heatmap upgrade
│
├── primitives/
│   ├── CanvasTooltip.tsx        # HTML tooltip positioned over canvas
│   ├── CanvasLegend.tsx         # Accessible legend
│   └── CanvasMinimap.tsx        # Navigation minimap
│
└── index.ts
```

### Core Components

#### CanvasContainer (React + Canvas 2D)

```typescript
interface CanvasContainerProps {
  width?: number | '100%';
  height?: number;
  onDraw: (ctx: CanvasRenderingContext2D, delta: number) => void;
  onResize?: (width: number, height: number) => void;
  onClick?: (x: number, y: number) => void;
  onHover?: (x: number, y: number) => void;
  fps?: number; // Target FPS, default 60
  pixelRatio?: number; // Default: devicePixelRatio
  ariaLabel: string;
  ariaDescription?: string;
}
```

#### PixiContainer (React + Pixi.js)

```typescript
interface PixiContainerProps {
  width?: number | '100%';
  height?: number;
  backgroundColor?: number;
  antialias?: boolean;
  onSetup: (app: PIXI.Application) => void;
  onTick?: (delta: number) => void;
  onDestroy?: () => void;
  ariaLabel: string;
}
```

---

## Implementación por Fases

### Fase 1: Infraestructura Core
1. Instalar dependencias
2. Crear CanvasContainer con resize observer
3. Crear useAnimationLoop con pause/resume
4. Crear PixiContainer wrapper
5. Tests unitarios para hooks

```bash
npm install pixi.js @pixi/react
```

**Bundle impact**: +150kb gzip (lazy loaded)

### Fase 2: Celebration Effects
1. Implementar ParticleEmitter base
2. Crear ConfettiCelebration
3. Integrar en SyncPreviewModal on success
4. A11y: anunciar "Sync completed" con aria-live

### Fase 3: FlowDiagram Optimization
1. Crear CanvasFlowEdges overlay
2. Migrar animación de edges de SVG a Canvas
3. Mantener nodos en React (interactividad)
4. Benchmark: medir FPS antes/después

### Fase 4: Network Visualization
1. Integrar d3-force para layout
2. Crear EngagementNetwork con Pixi
3. Implementar zoom/pan con Pixi viewport
4. Hover highlights con batched updates

### Fase 5: Mass Data Views
1. Crear PostDensityMap
2. Implementar brush selection
3. WebGL shaders para color mapping
4. Virtualized tooltip positioning

---

## Consideraciones de Performance

### Lazy Loading
```typescript
// Solo cargar Pixi cuando se necesita
const PixiContainer = dynamic(
  () => import('@/components/canvas/PixiContainer'),
  { ssr: false, loading: () => <Skeleton /> }
);
```

### Worker Offloading
```typescript
// Cálculos pesados en Web Worker
const worker = new Worker('./force-layout.worker.ts');
worker.postMessage({ nodes, edges });
worker.onmessage = (e) => updatePositions(e.data);
```

### Object Pooling
```typescript
// Reusar objetos para evitar GC
class ParticlePool {
  private pool: Particle[] = [];

  acquire(): Particle {
    return this.pool.pop() || new Particle();
  }

  release(p: Particle): void {
    p.reset();
    this.pool.push(p);
  }
}
```

---

## Accesibilidad

### Estrategias

1. **ARIA Labels**
```tsx
<canvas
  role="img"
  aria-label={ariaLabel}
  aria-describedby={descriptionId}
/>
<div id={descriptionId} className="sr-only">
  {accessibleDescription}
</div>
```

2. **Keyboard Navigation**
```typescript
// Focus management para elementos interactivos
onKeyDown={(e) => {
  if (e.key === 'Tab') focusNextNode();
  if (e.key === 'Enter') activateNode();
}}
```

3. **Reduced Motion**
```typescript
const prefersReducedMotion = useReducedMotion();
const fps = prefersReducedMotion ? 0 : 60; // Static render
```

4. **Alternative Views**
```tsx
{prefersReducedMotion ? (
  <StaticNetworkTable nodes={nodes} edges={edges} />
) : (
  <EngagementNetwork nodes={nodes} edges={edges} />
)}
```

---

## Métricas de Éxito

| Componente | Métrica | Target |
|------------|---------|--------|
| FlowDiagram edges | FPS durante animación | 60 FPS estable |
| EngagementNetwork | Render 1000 nodos | < 16ms frame time |
| PostDensityMap | Render 10k posts | < 100ms initial |
| Confetti | Particle count | 200+ sin lag |
| Bundle size | Pixi lazy chunk | < 200kb gzip |

---

## Dependencias

```json
{
  "pixi.js": "^8.x",
  "@pixi/react": "^7.x",
  "d3-force": "^3.x",
  "d3-scale": "^4.x"
}
```

**Nota**: d3-force y d3-scale ya están disponibles via d3 instalado.

---

## Timeline Estimado

| Fase | Duración | Dependencias |
|------|----------|--------------|
| Fase 1: Core | 1 sprint | - |
| Fase 2: Celebrations | 0.5 sprint | Fase 1 |
| Fase 3: FlowDiagram | 1 sprint | Fase 1 |
| Fase 4: Network | 1.5 sprints | Fase 1, 3 |
| Fase 5: Mass Data | 1 sprint | Fase 1 |

**Total**: ~5 sprints para implementación completa.

---

## Decisión: Pixi.js vs Canvas 2D

| Caso | Recomendación | Razón |
|------|---------------|-------|
| FlowDiagram edges | Canvas 2D | Simple, suficiente para beziers |
| Confetti | Canvas 2D | Partículas simples, no necesita WebGL |
| EngagementNetwork | **Pixi.js** | 1000+ nodos, necesita batching |
| PostDensityMap | **Pixi.js** | 10k+ rects, WebGL shaders |
| Heatmap | Canvas 2D | 168 celdas, overkill usar Pixi |

---

## Referencias

- [Pixi.js v8 Docs](https://pixijs.com/8.x/guides)
- [React + Pixi Integration](https://github.com/pixijs/pixi-react)
- [D3 Force Layout](https://d3js.org/d3-force)
- [Canvas Performance Tips](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
