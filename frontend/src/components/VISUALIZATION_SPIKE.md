# Visualization Libraries Spike

## Overview
Plan de integración de bibliotecas de visualización avanzada para ChirpSyncer frontend.

## Status

| Biblioteca | Estado | Componentes Target |
|------------|--------|-------------------|
| @xyflow/react | ✅ Implementado | FlowDiagram |
| @tanstack/react-virtual | ✅ Implementado | FeedPreview |
| framer-motion | ✅ Extendido | Sidebar, NotificationCenter, WidgetGrid, etc. |
| @nivo/* | ✅ Integrado | NivoChartWidget, WidgetRenderer (useNivo), Analytics page |
| d3 | ✅ Integrado | D3TimingHeatmap (exportado en scheduler/index.ts) |
| react-spring | ✅ Integrado | AnimatedNumber, AnimatedProgress, StatCard, Analytics page |
| pixi.js | ⏳ Futuro | Particle effects, Large data viz |

## Archivos Creados

### Infraestructura
- `src/styles/nivoTheme.ts` - Tema Nivo integrado con design system
- `frontend/babel.config.js` - Configuración para ESM modules (D3/Nivo)

### Componentes Nuevos
- `src/components/widgets/NivoChartWidget/` - Bar/Line/Area con Nivo
- `src/components/scheduler/D3TimingHeatmap.tsx` - Heatmap 7x24 con D3 (drop-in para TimingHeatmap)
- `src/components/ui/Motion/AnimatedNumber.tsx` - Números animados (react-spring)
- `src/components/ui/Motion/AnimatedProgress.tsx` - Progress bars animados
- `src/components/algorithm-dashboard/FeedCompositionChart/NivoFeedCompositionChart.tsx` - Pie chart con Nivo
- `src/components/feed-lab/RuleContributionChart/NivoRuleContributionChart.tsx` - Bar chart horizontal con Nivo

### Integraciones Completadas
- `WidgetRenderer` - Soporte para `useNivo: true` en config de charts
- `widgets/types.ts` - Props `useNivo` y `height` en chart data
- `StatCard` - Prop `animated` para números animados
- `Analytics page` - AnimatedNumber/AnimatedPercentage para stats, NivoChartWidget para charts
- `Card` - Ahora pasa todos los atributos `data-*` al DOM
- `D3TimingHeatmap` - Ahora usa misma API que TimingHeatmap (drop-in replacement)

---

## 1. Nivo Charts (@nivo/*)

### Por qué Nivo sobre Recharts
- Mejor theming con styled-components
- Más tipos de charts (sunburst, chord, network)
- Animaciones built-in más fluidas
- SSR compatible
- Mejor accesibilidad

### Paquetes a instalar
```bash
npm install @nivo/core @nivo/bar @nivo/line @nivo/pie @nivo/heatmap @nivo/network
```

### Componentes a migrar

#### ChartWidget.tsx
- **Actual**: Recharts (line, bar, area)
- **Nuevo**: @nivo/line, @nivo/bar
- **Beneficio**: Tooltips custom, animaciones, responsive nativo

#### FeedCompositionChart.tsx
- **Actual**: Recharts PieChart
- **Nuevo**: @nivo/pie o @nivo/sunburst
- **Beneficio**: Drill-down interactivo, mejor labels

#### RuleContributionChart.tsx
- **Actual**: Custom bars con styled-components
- **Nuevo**: @nivo/bar horizontal
- **Beneficio**: Stacked bars, animaciones, tooltips

---

## 2. D3.js (d3)

### Por qué D3
- Control total sobre visualizaciones custom
- Nivo lo usa internamente, útil para casos edge
- Necesario para: heatmaps, force graphs, custom axes

### Paquetes a instalar
```bash
npm install d3 @types/d3
```

### Componentes nuevos a crear

#### TimingHeatmap.tsx (scheduler)
- **Tipo**: Heatmap 7x24 (días x horas)
- **Data**: Engagement rate por hora/día
- **Interacción**: Click para programar post en esa hora
- **Colores**: Gradiente de engagement (verde = mejor)

#### EngagementNetwork.tsx (analytics)
- **Tipo**: Force-directed graph
- **Data**: Usuarios que interactúan con posts
- **Nodos**: Usuarios (tamaño = engagement)
- **Edges**: Interacciones (likes, retweets, replies)

#### PropagationFlow.tsx (analytics)
- **Tipo**: Sankey diagram
- **Data**: Cómo se propagan los posts entre plataformas
- **Flujo**: Original → Retweets → Replies → Quotes

---

## 3. react-spring (@react-spring/web)

### Por qué react-spring
- Physics-based animations más naturales
- Mejor para valores numéricos animados
- Interrumpible (no se "traba" mid-animation)
- Complementa Framer Motion

### Paquetes a instalar
```bash
npm install @react-spring/web
```

### Componentes a mejorar

#### Counter.tsx (ui/Motion)
- **Actual**: Framer Motion animate
- **Nuevo**: useSpring para números
- **Beneficio**: Easing natural, no salta

#### Progress.tsx
- **Actual**: CSS transition
- **Nuevo**: useSpring para width
- **Beneficio**: Bounce natural al completar

#### StatCard.tsx
- **Actual**: Número estático
- **Nuevo**: Animated number on mount/change
- **Beneficio**: Atrae atención a cambios

---

## 4. Pixi.js / Canvas (Futuro)

### Casos de uso potenciales
- **ParticleEffect**: Celebración al completar sync
- **MassPostViz**: Visualizar 10k+ posts sin lag
- **BackgroundAnimation**: Landing page hero

### No prioritario porque
- Overhead de bundle size
- Complejidad de integración con React
- Casos de uso limitados actualmente

---

## Orden de implementación

### Fase 1: Nivo ✅ COMPLETADO
1. ✅ Instalar paquetes Nivo
2. ✅ Crear NivoTheme.ts con colores del design system
3. ✅ Crear NivoChartWidget (drop-in replacement for ChartWidget)
4. ✅ Integrar en WidgetRenderer con prop `useNivo`
5. ✅ Integrar en Analytics page
6. ✅ Crear NivoFeedCompositionChart (drop-in con @nivo/pie)
7. ✅ Crear NivoRuleContributionChart (drop-in con @nivo/bar)

### Fase 2: D3 Custom ✅ COMPLETADO
1. ✅ Instalar D3
2. ✅ Crear D3TimingHeatmap con D3
3. ✅ Exportar desde scheduler/index.ts
4. ⏳ Crear hooks: useD3, useHeatmapScale (opcional)

### Fase 3: react-spring ✅ COMPLETADO
1. ✅ Instalar react-spring
2. ✅ Crear AnimatedNumber, AnimatedPercentage, AnimatedCurrency, AnimatedCompactNumber
3. ✅ Crear AnimatedProgress, AnimatedCircularProgress
4. ✅ Integrar en StatCard con prop `animated`
5. ✅ Integrar en Analytics page

### Fase 4: Integración Final ✅ COMPLETADO
1. ✅ Migrar componentes feed-lab a usar Nivo (NivoFeedCompositionChart, NivoRuleContributionChart)
2. ✅ D3TimingHeatmap actualizado como drop-in replacement para TimingHeatmap
3. ⏳ Agregar más variantes de charts (network, force graph)
4. ⏳ Integrar D3TimingHeatmap en scheduler page (opcional - ya es compatible)

---

## Testing Strategy

### Unit Tests
- Mock de canvas context para D3
- Snapshot tests para SVG output
- Interaction tests para tooltips

### Visual Tests (Storybook)
- Stories para cada variante de chart
- Chromatic para regression visual

### Performance Tests
- Benchmark con 1000+ data points
- Memory profiling para leaks

---

## Bundle Size Considerations

| Paquete | Tamaño (gzip) | Tree-shakeable |
|---------|---------------|----------------|
| @nivo/bar | ~45kb | ✅ |
| @nivo/line | ~40kb | ✅ |
| @nivo/pie | ~35kb | ✅ |
| d3 (full) | ~75kb | ⚠️ Importar módulos |
| d3-scale + d3-shape | ~15kb | ✅ |
| @react-spring/web | ~25kb | ✅ |

### Estrategia
- Lazy load charts con next/dynamic
- Importar solo módulos D3 necesarios
- Code splitting por ruta

---

## Referencias
- [Nivo Docs](https://nivo.rocks/)
- [D3 Gallery](https://observablehq.com/@d3/gallery)
- [react-spring Docs](https://react-spring.dev/)
