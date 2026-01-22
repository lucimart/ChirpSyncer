# ChirpSyncer UI/UX Redesign Plan

> **Objetivo**: Modernizar la interfaz con dark theme, design system centralizado y mejor organización de navegación.
> 
> **Fecha**: Enero 2026
> **Autor**: AI Assistant + User Review
> **Fuente unica**: Este documento es la fuente de verdad para UI/UX. El anexo `docs/UI_UX_INNOVATIONS.md` solo resume y apunta aqui.

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Innovaciones (Resumen)](#innovaciones-resumen)
3. [Problemas Identificados](#problemas-identificados)
4. [Design System](#design-system)
5. [Sprints y User Stories](#sprints-y-user-stories)
6. [Plan de Testing E2E](#plan-de-testing-e2e)
7. [Criterios de Aceptación](#criterios-de-aceptación)

---

## Resumen Ejecutivo

### Estado Actual
- 15+ items en menú lateral sin agrupación lógica
- Tema claro único (muy brillante, causa fatiga visual)
- Inconsistencias en componentes (botones, spacing, iconos)
- Algunas páginas con layouts problemáticos (Feed Lab, Connectors)
- No existe design system centralizado

### Objetivo Final
- Dark theme como default con opción de light theme
- Menú reorganizado con secciones colapsables (de 15 items a 5 grupos)
- Design system con tokens, componentes y patrones documentados
- UI consistente en todas las páginas

---

## Innovaciones (Resumen)

### Innovacion: Onboarding Gamificado
- Fase: P0
- Objetivo: reemplazar empty state por progreso guiado

### Innovacion: Command Palette
- Fase: P0
- Objetivo: acceso rapido a acciones por teclado

### Innovacion: Sync Preview
- Fase: P1
- Objetivo: mostrar que se sincronizara antes de ejecutar

### Innovacion: Visual Flow Diagram
- Fase: P2
- Objetivo: visualizar conexiones y flujos de datos

### Innovacion: Smart Timing Heatmap
- Fase: P1
- Objetivo: recomendar horarios de publicacion

### Innovacion: Feed Lab Recipes
- Fase: P2
- Objetivo: recetas predefinidas para reglas de feed

### Innovacion: Login Moderno
- Fase: P2
- Objetivo: login con passkeys, SSO y branding

### Innovacion: Notificaciones Inteligentes
- Fase: P1
- Objetivo: umbrales configurables por canal

### Innovacion: Error Resolution Contextual
- Fase: P0
- Objetivo: diagnostico y resolucion inline

### Innovacion: Dashboard Widgets
- Fase: P2
- Objetivo: widgets personalizables con layouts guardables

---

## Problemas Identificados

### 1. Navegación Sobrecargada

**Actual** (15 items planos):
```
MENU: Dashboard, Credentials, Connectors, Sync, Scheduler, Cleanup, 
      Search, Analytics, Algorithm, Feed Lab, Workspaces, Bookmarks, Export
SETTINGS: Settings
ADMIN: User Management
```

**Propuesto** (5 grupos colapsables):
```
Dashboard (siempre visible)
PLATFORMS: Connectors, Credentials
CONTENT: Sync, Scheduler, Search, Cleanup
INSIGHTS: Analytics, Feed Lab, Algorithm  
ORGANIZE: Workspaces, Bookmarks, Export
Settings + Admin (footer)
```

### 2. Ausencia de Dark Theme

| Problema | Impacto |
|----------|---------|
| Fondo #F9FAFB muy claro | Fatiga visual en uso prolongado |
| Sin toggle funcional | Setting existe pero dice "Coming soon" |
| No hay tokens de color | Cambiar tema requiere editar múltiples archivos |

### 3. Inconsistencias de Componentes

| Componente | Inconsistencia |
|------------|----------------|
| Botones | Mezcla de filled/outlined sin patrón claro |
| Cards | Diferentes border-radius y shadows |
| Spacing | Gaps variables (8px, 12px, 16px, 24px sin sistema) |
| Iconos | Lucide icons pero algunos filled, otros outline |
| Empty States | Algunos con CTA, otros sin acción |

### 4. Páginas Problemáticas

| Página | Problema | Severidad |
|--------|----------|-----------|
| Algorithm | Error 500, página rota | CRÍTICO |
| Feed Lab | Demasiada información, layout caótico | ALTO |
| Connectors | Cards muy largas con badges excesivos | MEDIO |
| Login/Register | Card descentrada | BAJO |
| Workspaces | 5 secciones en una página | MEDIO |

---

## Design System

### Arquitectura de Archivos

```
frontend/src/
├── styles/
│   ├── tokens/
│   │   ├── colors.ts          # Paleta de colores (light + dark)
│   │   ├── spacing.ts         # Sistema de spacing (4px base)
│   │   ├── typography.ts      # Font sizes, weights, line-heights
│   │   ├── shadows.ts         # Elevation system
│   │   ├── radii.ts           # Border radius tokens
│   │   └── index.ts           # Export all tokens
│   ├── theme.ts               # Theme provider con light/dark
│   ├── GlobalStyle.ts         # Reset + base styles (ACTUALIZAR)
│   └── mixins.ts              # Reusable style patterns
├── components/
│   └── ui/
│       ├── Button.tsx         # ACTUALIZAR con variants
│       ├── Card.tsx           # ACTUALIZAR con consistent styles
│       ├── Input.tsx          # ACTUALIZAR
│       ├── Badge.tsx          # NUEVO
│       ├── Toggle.tsx         # NUEVO
│       ├── Tooltip.tsx        # NUEVO
│       ├── EmptyState.tsx     # NUEVO
│       ├── CollapsibleMenu.tsx # NUEVO
│       └── index.ts
```

### Color Tokens

```typescript
// styles/tokens/colors.ts

export const colors = {
  // Base palette
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Semantic colors
  success: {
    light: '#10B981',
    dark: '#34D399',
  },
  warning: {
    light: '#F59E0B',
    dark: '#FBBF24',
  },
  error: {
    light: '#EF4444',
    dark: '#F87171',
  },
};

export const lightTheme = {
  // Backgrounds
  bgPrimary: colors.slate[50],
  bgSecondary: '#FFFFFF',
  bgTertiary: colors.slate[100],
  bgHover: colors.slate[100],
  bgActive: colors.blue[50],
  
  // Sidebar
  sidebarBg: '#FFFFFF',
  sidebarBorder: colors.slate[200],
  sidebarItemHover: colors.slate[100],
  sidebarItemActive: colors.blue[50],
  sidebarItemActiveText: colors.blue[600],
  
  // Text
  textPrimary: colors.slate[900],
  textSecondary: colors.slate[600],
  textTertiary: colors.slate[400],
  textInverse: '#FFFFFF',
  
  // Borders
  borderLight: colors.slate[200],
  borderMedium: colors.slate[300],
  
  // Accent
  accent: colors.blue[600],
  accentHover: colors.blue[700],
  accentLight: colors.blue[100],
  
  // Status
  success: colors.success.light,
  warning: colors.warning.light,
  error: colors.error.light,
};

export const darkTheme = {
  // Backgrounds
  bgPrimary: colors.slate[900],
  bgSecondary: colors.slate[800],
  bgTertiary: colors.slate[700],
  bgHover: colors.slate[700],
  bgActive: colors.slate[700],
  
  // Sidebar
  sidebarBg: colors.slate[800],
  sidebarBorder: colors.slate[700],
  sidebarItemHover: colors.slate[700],
  sidebarItemActive: colors.slate[700],
  sidebarItemActiveText: colors.blue[400],
  
  // Text
  textPrimary: colors.slate[100],
  textSecondary: colors.slate[400],
  textTertiary: colors.slate[500],
  textInverse: colors.slate[900],
  
  // Borders
  borderLight: colors.slate[700],
  borderMedium: colors.slate[600],
  
  // Accent
  accent: colors.blue[500],
  accentHover: colors.blue[400],
  accentLight: colors.slate[700],
  
  // Status
  success: colors.success.dark,
  warning: colors.warning.dark,
  error: colors.error.dark,
};
```

### Spacing Tokens

```typescript
// styles/tokens/spacing.ts

// Base unit: 4px
export const spacing = {
  0: '0',
  1: '4px',    // xs
  2: '8px',    // sm
  3: '12px',   // md
  4: '16px',   // lg
  5: '20px',   // xl
  6: '24px',   // 2xl
  8: '32px',   // 3xl
  10: '40px',  // 4xl
  12: '48px',  // 5xl
  16: '64px',  // 6xl
};

// Semantic spacing
export const layout = {
  sidebarWidth: '260px',
  sidebarCollapsedWidth: '72px',
  headerHeight: '64px',
  pageGutter: spacing[6],      // 24px
  cardPadding: spacing[5],     // 20px
  sectionGap: spacing[6],      // 24px
  componentGap: spacing[4],    // 16px
  inlineGap: spacing[2],       // 8px
};
```

### Typography Tokens

```typescript
// styles/tokens/typography.ts

export const fontFamily = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export const fontSize = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
};

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

// Semantic typography
export const textStyles = {
  h1: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
  },
  h2: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  h3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
  },
};
```

### Shadow Tokens

```typescript
// styles/tokens/shadows.ts

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

// Dark theme shadows (more subtle)
export const shadowsDark = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
};
```

### Border Radius Tokens

```typescript
// styles/tokens/radii.ts

export const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};
```

---

## Sprints y User Stories

### Sprint 1: Design System Foundation (3-4 días)

**Objetivo**: Establecer la base del design system con tokens y theme provider.

#### US-1.1: Crear Token System
**Como** desarrollador  
**Quiero** tener tokens de diseño centralizados  
**Para** mantener consistencia visual en toda la aplicación

**Tareas**:
- [ ] Crear `styles/tokens/colors.ts` con paleta light/dark
- [ ] Crear `styles/tokens/spacing.ts` con sistema 4px
- [ ] Crear `styles/tokens/typography.ts` con escalas de texto
- [ ] Crear `styles/tokens/shadows.ts` con elevaciones
- [ ] Crear `styles/tokens/radii.ts` con border-radius
- [ ] Crear `styles/tokens/index.ts` que exporte todo

**Criterios de Aceptación**:
- Todos los tokens exportados desde un único punto
- TypeScript types para autocompletado
- Documentación inline con comentarios

---

#### US-1.2: Implementar Theme Provider
**Como** usuario  
**Quiero** poder cambiar entre tema claro y oscuro  
**Para** reducir fatiga visual según mi preferencia

**Tareas**:
- [ ] Crear `ThemeContext` con React Context
- [ ] Implementar `useTheme` hook
- [ ] Persistir preferencia en localStorage
- [ ] Respetar `prefers-color-scheme` del sistema
- [ ] Actualizar `GlobalStyle.ts` para usar tokens

**Criterios de Aceptación**:
- Toggle funciona en Settings page
- Preferencia persiste entre sesiones
- Transición suave (0.2s) al cambiar tema
- Sin flash de tema incorrecto al cargar

---

#### US-1.3: Actualizar GlobalStyle
**Como** desarrollador  
**Quiero** que los estilos base usen el theme provider  
**Para** que el dark mode funcione automáticamente

**Tareas**:
- [ ] Migrar colores hardcodeados a tokens
- [ ] Añadir CSS custom properties para colores
- [ ] Actualizar reset/normalize styles
- [ ] Añadir smooth transitions para theme change

**Criterios de Aceptación**:
- No hay colores hardcodeados en GlobalStyle
- Body background cambia con el tema
- Scrollbars estilizadas para dark mode

---

### Sprint 2: Core Components Update (4-5 días)

**Objetivo**: Actualizar componentes base para usar design system.

#### US-2.1: Actualizar Button Component
**Como** usuario  
**Quiero** botones consistentes en toda la app  
**Para** tener una experiencia predecible

**Tareas**:
- [ ] Definir variants: `primary`, `secondary`, `ghost`, `danger`
- [ ] Definir sizes: `sm`, `md`, `lg`
- [ ] Implementar estados: hover, active, disabled, loading
- [ ] Usar tokens para colores y spacing
- [ ] Añadir soporte para iconos (left/right)

**Criterios de Aceptación**:
- Todos los botones existentes migrados
- Contraste WCAG AA en ambos temas
- Loading state con spinner
- Focus visible para accesibilidad

---

#### US-2.2: Actualizar Card Component
**Como** usuario  
**Quiero** cards con apariencia consistente  
**Para** identificar fácilmente secciones de contenido

**Tareas**:
- [ ] Estandarizar padding usando tokens
- [ ] Definir variants: `default`, `elevated`, `outlined`
- [ ] Implementar header/body/footer slots
- [ ] Usar shadow tokens para elevación

**Criterios de Aceptación**:
- Todas las cards existentes migradas
- Border radius consistente (radii.lg)
- Sombras apropiadas para cada tema

---

#### US-2.3: Actualizar Input Component
**Como** usuario  
**Quiero** inputs con feedback visual claro  
**Para** saber el estado de mis formularios

**Tareas**:
- [ ] Definir estados: default, focus, error, disabled
- [ ] Añadir soporte para labels y helper text
- [ ] Implementar prefix/suffix icons
- [ ] Usar tokens para colores y spacing

**Criterios de Aceptación**:
- Focus ring visible en ambos temas
- Error state con color y mensaje
- Placeholder con contraste adecuado

---

#### US-2.4: Crear Badge Component
**Como** usuario  
**Quiero** badges para ver estados y categorías  
**Para** identificar rápidamente información importante

**Tareas**:
- [ ] Definir variants: `default`, `success`, `warning`, `error`, `info`
- [ ] Definir sizes: `sm`, `md`
- [ ] Soporte para dot indicator
- [ ] Soporte para icono

**Criterios de Aceptación**:
- Usado en Credentials (platform badges)
- Usado en Admin (role badges)
- Usado en Connectors (capability badges)

---

#### US-2.5: Crear EmptyState Component
**Como** usuario  
**Quiero** ver mensajes claros cuando no hay datos  
**Para** saber qué acción tomar

**Tareas**:
- [ ] Diseñar layout con icono, título, descripción, CTA
- [ ] Definir variants por contexto (no-data, error, search-empty)
- [ ] Hacer CTA opcional pero recomendado

**Criterios de Aceptación**:
- Usado en todas las páginas con listas vacías
- CTA lleva a acción relevante
- Icono contextual (no genérico)

---

### Sprint 3: Sidebar Reorganization (3-4 días)

**Objetivo**: Reorganizar navegación con grupos colapsables.

#### US-3.1: Crear CollapsibleMenu Component
**Como** usuario  
**Quiero** poder colapsar secciones del menú  
**Para** reducir el ruido visual y encontrar opciones más rápido

**Tareas**:
- [ ] Crear componente con animación de expand/collapse
- [ ] Persistir estado de secciones en localStorage
- [ ] Indicador visual de sección expandida/colapsada
- [ ] Keyboard navigation (Enter/Space para toggle)

**Criterios de Aceptación**:
- Animación suave (0.2s ease)
- Estado persiste entre sesiones
- Accesible con teclado

---

#### US-3.2: Reorganizar Items del Sidebar
**Como** usuario  
**Quiero** ver el menú organizado por categorías lógicas  
**Para** encontrar funciones relacionadas juntas

**Nueva estructura**:
```
Dashboard (siempre visible, no colapsable)

PLATFORMS (colapsable)
├── Connectors
└── Credentials

CONTENT (colapsable)
├── Sync
├── Scheduler
├── Search
└── Cleanup

INSIGHTS (colapsable)
├── Analytics
├── Feed Lab
└── Algorithm

ORGANIZE (colapsable)
├── Workspaces
├── Bookmarks
└── Export

─────────────────
Settings (footer, siempre visible)
Admin (footer, solo si is_admin)
```

**Tareas**:
- [ ] Actualizar `Sidebar.tsx` con nueva estructura
- [ ] Crear constante con menu items agrupados
- [ ] Implementar lógica de sección activa
- [ ] Añadir iconos de chevron para expand/collapse

**Criterios de Aceptación**:
- Máximo 5 items visibles sin expandir
- Sección activa se expande automáticamente
- Hover states claros en ambos temas

---

#### US-3.3: Sidebar Responsive
**Como** usuario móvil  
**Quiero** un sidebar que funcione en pantallas pequeñas  
**Para** navegar la app desde mi teléfono

**Tareas**:
- [x] Implementar sidebar colapsable a iconos en tablet
- [x] Implementar drawer/overlay en móvil
- [x] Añadir hamburger menu button
- [x] Gesture support para swipe open/close

**Criterios de Aceptación**:
- < 1024px: sidebar colapsado a iconos
- < 768px: sidebar como drawer overlay
- Swipe right desde edge abre sidebar

---

### Sprint 4: Page-Specific Fixes (4-5 días)

**Objetivo**: Arreglar páginas con problemas de layout.

#### US-4.1: Fix Algorithm Page (Error 500)
**Como** usuario  
**Quiero** ver la página Algorithm sin errores  
**Para** usar la funcionalidad de transparencia de algoritmo

**Tareas**:
- [ ] Investigar causa del error 500 en backend
- [ ] Implementar error boundary en frontend
- [ ] Mostrar estado de error graceful con retry button
- [ ] Arreglar endpoint `/api/v1/algorithm/stats`

**Criterios de Aceptación**:
- Página carga sin error
- Si hay error de API, muestra mensaje amigable
- Botón de retry funciona

---

#### US-4.2: Rediseñar Feed Lab Page
**Como** usuario  
**Quiero** una página Feed Lab más organizada  
**Para** crear y gestionar reglas sin confusión

**Tareas**:
- [ ] Separar en tabs: "My Rules" | "Create Rule" | "Preview"
- [ ] Simplificar formulario de creación
- [ ] Mejorar visualización de preview
- [ ] Añadir explicaciones inline

**Criterios de Aceptación**:
- Máximo 1 acción principal visible por tab
- Preview actualiza en tiempo real
- Reglas existentes fáciles de editar/eliminar

---

#### US-4.3: Simplificar Connectors Page
**Como** usuario  
**Quiero** ver información esencial de cada plataforma  
**Para** conectar cuentas sin overwhelm de información

**Tareas**:
- [ ] Colapsar capabilities por defecto
- [ ] Mostrar solo: nombre, estado, última sync
- [ ] Expandir detalles on click/hover
- [ ] Mover Sync Configuration a modal o página separada

**Criterios de Aceptación**:
- Card height reducido 50%
- Capabilities visibles solo al expandir
- Sync config accesible pero no inline

---

#### US-4.4: Fix Login/Register Centering
**Como** usuario  
**Quiero** ver el formulario de login centrado  
**Para** tener una primera impresión profesional

**Tareas**:
- [ ] Centrar card horizontal y verticalmente
- [ ] Añadir background pattern o gradient sutil
- [ ] Mejorar contraste de subtitle
- [ ] Añadir "Forgot password" link

**Criterios de Aceptación**:
- Card perfectamente centrada en viewport
- Funciona en todos los tamaños de pantalla
- Dark theme aplicado a auth pages

---

#### US-4.5: Reorganizar Workspaces Page
**Como** usuario  
**Quiero** gestionar workspaces sin scroll excesivo  
**Para** encontrar configuraciones rápidamente

**Tareas**:
- [ ] Implementar tabs: Settings | Members | Permissions | Activity
- [ ] Mover workspace switcher a header o sidebar
- [ ] Simplificar permissions matrix (mostrar resumen, expandir detalles)

**Criterios de Aceptación**:
- Máximo 1 scroll de página por tab
- Tab activo persiste en URL (query param)
- Permissions matrix colapsable

---

### Sprint 5: Polish & Testing (3-4 días)

**Objetivo**: Pulir detalles y asegurar calidad con tests.

#### US-5.1: Audit de Consistencia Visual
**Como** desarrollador  
**Quiero** verificar que todos los componentes usan tokens  
**Para** garantizar consistencia visual

**Tareas**:
- [ ] Buscar colores hardcodeados y migrar
- [ ] Verificar spacing consistente
- [ ] Verificar typography consistente
- [ ] Verificar shadows y radii

**Criterios de Aceptación**:
- 0 colores hardcodeados fuera de tokens
- Lint rule para prevenir colores inline

---

#### US-5.2: Accessibility Audit
**Como** usuario con discapacidad  
**Quiero** poder usar la app con tecnologías asistivas  
**Para** tener acceso igual a las funcionalidades

**Tareas**:
- [ ] Verificar contraste WCAG AA en ambos temas
- [ ] Añadir aria-labels donde falten
- [ ] Verificar keyboard navigation completa
- [ ] Verificar screen reader compatibility

**Criterios de Aceptación**:
- Lighthouse accessibility score > 90
- Todos los interactive elements focusables
- Skip to content link presente

---

#### US-5.3: E2E Tests para Theme
**Como** desarrollador  
**Quiero** tests automatizados para el theme system  
**Para** prevenir regresiones visuales

**Tareas**:
- [ ] Test: toggle theme cambia colores
- [ ] Test: preferencia persiste en localStorage
- [ ] Test: respeta prefers-color-scheme
- [ ] Test: no flash de tema incorrecto

**Criterios de Aceptación**:
- Tests pasan en CI
- Coverage de theme provider > 90%

---

#### US-5.4: E2E Tests para Sidebar
**Como** desarrollador  
**Quiero** tests automatizados para el sidebar  
**Para** prevenir regresiones de navegación

**Tareas**:
- [ ] Test: secciones colapsan/expanden
- [ ] Test: navegación a todas las páginas
- [ ] Test: estado persiste en localStorage
- [ ] Test: responsive behavior

**Criterios de Aceptación**:
- Tests pasan en CI
- Todos los menu items testeados

---

### Sprint 6: Release & Monitoring (2-3 días)

**Objetivo**: Publicar el rediseño con control y medir impacto real.

#### US-6.1: Rollout Controlado
**Como** equipo de producto  
**Quiero** desplegar el rediseño con feature flags  
**Para** reducir riesgo de regresiones en producción

**Tareas**:
- [ ] Crear feature flags para Theme, Sidebar y Components
- [ ] Habilitar rollout gradual por cohortes
- [ ] Plan de rollback documentado

**Criterios de Aceptación**:
- Feature flags activos y testeados en staging
- Rollout puede limitarse por porcentaje de usuarios
- Rollback ejecutable en < 30 min

---

#### US-6.2: Observabilidad UI/UX
**Como** PM/Engineering  
**Quiero** medir el impacto del rediseño  
**Para** priorizar mejoras post-lanzamiento

**Tareas**:
- [ ] Definir eventos clave (theme toggle, sidebar collapse, CTA clicks)
- [ ] Dashboard de métricas UI en analytics
- [ ] Alertas por errores UI críticos

**Criterios de Aceptación**:
- Eventos visibles en analytics en < 24h
- Dashboard con KPIs de uso y adopción
- Alertas activas para errores críticos

---

#### US-6.3: Ciclo de Feedback
**Como** usuario  
**Quiero** dar feedback rápido sobre el rediseño  
**Para** reportar problemas o sugerir mejoras

**Tareas**:
- [ ] Micro-survey in-app (1-2 preguntas)
- [ ] Botón "Reportar problema" en Settings
- [ ] Backlog inicial de issues post-release

**Criterios de Aceptación**:
- Feedback se guarda con contexto de página
- Workflow de triage definido
- Backlog inicial priorizado

---

## Plan de Testing E2E

### Test Suite: Theme System

```typescript
// tests/e2e/theme.spec.ts

describe('Theme System', () => {
  describe('THEME-001: Toggle Dark/Light Mode', () => {
    it('should toggle theme when clicking switch in settings', async () => {
      // 1. Navigate to settings
      // 2. Find theme toggle
      // 3. Click toggle
      // 4. Verify background color changed
      // 5. Verify text color changed
    });

    it('should persist theme preference in localStorage', async () => {
      // 1. Set theme to dark
      // 2. Reload page
      // 3. Verify theme is still dark
      // 4. Check localStorage value
    });

    it('should respect system preference on first visit', async () => {
      // 1. Clear localStorage
      // 2. Set system to dark mode
      // 3. Load page
      // 4. Verify dark theme applied
    });

    it('should not flash wrong theme on load', async () => {
      // 1. Set theme to dark
      // 2. Reload with performance timing
      // 3. Verify no white flash before dark renders
    });
  });

  describe('THEME-002: Color Contrast', () => {
    it('should have WCAG AA contrast in light mode', async () => {
      // 1. Set light mode
      // 2. Check text/background contrast ratios
      // 3. Verify all > 4.5:1 for normal text
    });

    it('should have WCAG AA contrast in dark mode', async () => {
      // 1. Set dark mode
      // 2. Check text/background contrast ratios
      // 3. Verify all > 4.5:1 for normal text
    });
  });
});
```

### Test Suite: Sidebar Navigation

```typescript
// tests/e2e/sidebar.spec.ts

describe('Sidebar Navigation', () => {
  describe('SIDEBAR-001: Collapsible Sections', () => {
    it('should collapse section when clicking header', async () => {
      // 1. Find PLATFORMS section
      // 2. Verify expanded (items visible)
      // 3. Click section header
      // 4. Verify collapsed (items hidden)
    });

    it('should expand section when clicking collapsed header', async () => {
      // 1. Collapse PLATFORMS section
      // 2. Click section header
      // 3. Verify expanded (items visible)
    });

    it('should persist collapse state in localStorage', async () => {
      // 1. Collapse INSIGHTS section
      // 2. Reload page
      // 3. Verify INSIGHTS still collapsed
    });

    it('should auto-expand section containing active page', async () => {
      // 1. Collapse all sections
      // 2. Navigate to /dashboard/analytics
      // 3. Verify INSIGHTS section expanded
    });
  });

  describe('SIDEBAR-002: Navigation', () => {
    const pages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Connectors', path: '/dashboard/connectors' },
      { name: 'Credentials', path: '/dashboard/credentials' },
      { name: 'Sync', path: '/dashboard/sync' },
      { name: 'Scheduler', path: '/dashboard/scheduler' },
      { name: 'Search', path: '/dashboard/search' },
      { name: 'Cleanup', path: '/dashboard/cleanup' },
      { name: 'Analytics', path: '/dashboard/analytics' },
      { name: 'Feed Lab', path: '/dashboard/feed-lab' },
      { name: 'Algorithm', path: '/dashboard/algorithm' },
      { name: 'Workspaces', path: '/dashboard/workspaces' },
      { name: 'Bookmarks', path: '/dashboard/bookmarks' },
      { name: 'Export', path: '/dashboard/export' },
      { name: 'Settings', path: '/dashboard/settings' },
    ];

    pages.forEach(({ name, path }) => {
      it(`should navigate to ${name} page`, async () => {
        // 1. Click menu item
        // 2. Verify URL changed to path
        // 3. Verify page title/heading
      });
    });
  });

  describe('SIDEBAR-003: Responsive Behavior', () => {
    it('should show icon-only sidebar on tablet', async () => {
      // 1. Set viewport to 1024px
      // 2. Verify sidebar width is collapsed
      // 3. Verify only icons visible
    });

    it('should show drawer on mobile', async () => {
      // 1. Set viewport to 375px
      // 2. Verify sidebar hidden
      // 3. Click hamburger menu
      // 4. Verify sidebar appears as overlay
    });
  });
});
```

### Test Suite: Components

```typescript
// tests/e2e/components.spec.ts

describe('UI Components', () => {
  describe('COMP-001: Buttons', () => {
    it('should show loading state', async () => {
      // 1. Find button with loading prop
      // 2. Verify spinner visible
      // 3. Verify button disabled
    });

    it('should have correct colors for each variant', async () => {
      // Test primary, secondary, ghost, danger variants
    });
  });

  describe('COMP-002: Empty States', () => {
    it('should show CTA in empty bookmarks', async () => {
      // 1. Navigate to bookmarks (empty)
      // 2. Verify empty state message
      // 3. Verify CTA button present
      // 4. Click CTA
      // 5. Verify navigation/action
    });
  });
});
```

---

## Criterios de Aceptación Global

### Performance
- [ ] Lighthouse Performance score > 80
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No layout shift on theme change

### Accessibility
- [ ] Lighthouse Accessibility score > 90
- [ ] All interactive elements keyboard accessible
- [ ] Color contrast WCAG AA compliant
- [ ] Screen reader compatible

### Browser Support
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)

### Responsive
- [ ] Desktop (1920px, 1440px, 1280px)
- [ ] Tablet (1024px, 768px)
- [ ] Mobile (428px, 375px, 320px)

---

## Timeline Estimado

| Sprint | Duración | Entregables |
|--------|----------|-------------|
| Sprint 1 | 3-4 días | Design tokens, Theme provider, GlobalStyle |
| Sprint 2 | 4-5 días | Button, Card, Input, Badge, EmptyState |
| Sprint 3 | 3-4 días | CollapsibleMenu, Sidebar reorganizado |
| Sprint 4 | 4-5 días | Fixes de páginas específicas |
| Sprint 5 | 3-4 días | Polish, accessibility, E2E tests |
| Sprint 6 | 2-3 días | Release controlado, métricas, feedback |
| **Total** | **19-25 días** | UI/UX Redesign completo |

---

## Notas de Implementación

### Orden de Migración Recomendado

1. **Tokens primero**: Sin tokens, no podemos hacer nada consistente
2. **Theme provider**: Habilita dark mode inmediatamente
3. **GlobalStyle**: Aplica tema a toda la app
4. **Componentes core**: Button, Card, Input (más usados)
5. **Sidebar**: Mejora navegación
6. **Páginas específicas**: Fixes individuales
7. **Tests**: Asegurar que no rompemos nada

### Control de Alcance

- Priorizar MVP por sprint antes de extras visuales
- Diferir automatizaciones avanzadas si bloquean el core
- Limitar componentes nuevos por sprint para evitar regresiones

### Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Breaking changes en componentes | Alta | Alto | Migrar gradualmente, mantener props existentes |
| Regresiones visuales | Media | Medio | Screenshots comparativos en CI |
| Performance degradation | Baja | Alto | Lighthouse en CI, lazy load |
| Conflictos con styled-components | Media | Medio | Usar ThemeProvider de styled-components |

---

## Apéndice: Screenshots de Referencia

Los screenshots capturados están en:
```
docs/screenshots/ui-audit-2026-01/
```

| Archivo | Página | Notas |
|---------|--------|-------|
| 01-landing-page.png | Dashboard | Menú actual, tema claro |
| 02-credentials.png | Credentials | Cards de credenciales |
| 03-connectors.png | Connectors | Cards muy largas |
| 04-sync.png | Sync | Layout OK |
| 05-scheduler.png | Scheduler | Layout OK |
| 06-cleanup.png | Cleanup | Empty state sin CTA |
| 07-search.png | Search | Layout OK |
| 08-analytics.png | Analytics | Charts placeholder |
| 09-algorithm.png | Algorithm | ERROR 500 |
| 10-feed-lab.png | Feed Lab | Muy desordenado |
| 11-workspaces.png | Workspaces | Demasiadas secciones |
| 12-bookmarks.png | Bookmarks | Empty state sin CTA |
| 13-export.png | Export | Layout OK |
| 14-settings.png | Settings | Toggle "Coming soon" |
| 15-admin-users.png | Admin Users | Layout OK |
| 16-login.png | Login | Descentrado |
| 17-register.png | Register | Descentrado |
