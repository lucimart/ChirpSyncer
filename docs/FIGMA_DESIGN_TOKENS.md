# ChirpSyncer Design Tokens para Figma

Este documento contiene todos los tokens del Design System para configurar en Figma.

## Colores - Dark Theme (Actual)

### Base Palette

| Token | Hex | Uso |
|-------|-----|-----|
| slate.50 | `#F8FAFC` | - |
| slate.100 | `#F1F5F9` | Text Primary (dark) |
| slate.200 | `#E2E8F0` | - |
| slate.300 | `#CBD5E1` | - |
| slate.400 | `#94A3B8` | Text Secondary |
| slate.500 | `#64748B` | Text Tertiary |
| slate.600 | `#475569` | Borders, Input borders |
| slate.700 | `#334155` | Cards, Hover states |
| slate.800 | `#1E293B` | Sidebar BG, Card BG |
| slate.900 | `#0F172A` | Page BG Primary |
| slate.950 | `#020617` | - |

### Accent - Blue

| Token | Hex | Uso |
|-------|-----|-----|
| blue.400 | `#60A5FA` | Links, Active states |
| blue.500 | `#3B82F6` | Accent Primary, Focus |
| blue.600 | `#2563EB` | Button Primary BG |
| blue.700 | `#1D4ED8` | Button Hover |

### Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| Success | green.400 | `#4ADE80` |
| Warning | yellow.400 | `#FACC15` |
| Error | red.400 | `#F87171` |
| Info | blue.400 | `#60A5FA` |

### Platform Colors

| Platform | Hex |
|----------|-----|
| Twitter | `#1DA1F2` |
| Bluesky | `#0085FF` |
| Mastodon | `#6364FF` |
| Instagram | `#E4405F` |

---

## Tipografía

### Font Families

| Tipo | Familia |
|------|---------|
| Sans | `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto` |
| Mono | `JetBrains Mono, Fira Code, SF Mono, Monaco` |

### Font Sizes

| Token | Size | px |
|-------|------|-----|
| xs | 0.75rem | 12px |
| sm | 0.875rem | 14px |
| base | 1rem | 16px |
| lg | 1.125rem | 18px |
| xl | 1.25rem | 20px |
| 2xl | 1.5rem | 24px |
| 3xl | 1.875rem | 30px |
| 4xl | 2.25rem | 36px |

### Text Styles

| Style | Size | Weight | Line Height |
|-------|------|--------|-------------|
| H1 | 30px | Bold (700) | 1.25 |
| H2 | 24px | Semibold (600) | 1.25 |
| H3 | 20px | Semibold (600) | 1.375 |
| H4 | 18px | Semibold (600) | 1.375 |
| Body | 16px | Normal (400) | 1.5 |
| Body Small | 14px | Normal (400) | 1.5 |
| Label | 14px | Medium (500) | 1.25 |
| Caption | 12px | Normal (400) | 1.5 |
| Button | 14px | Medium (500) | 1.25 |
| Nav Item | 14px | Medium (500) | 1.25 |
| Nav Section | 12px | Semibold (600) | 1.5, UPPERCASE |

---

## Spacing (Base 4px)

| Token | Value |
|-------|-------|
| 1 | 4px |
| 2 | 8px |
| 3 | 12px |
| 4 | 16px |
| 5 | 20px |
| 6 | 24px |
| 8 | 32px |
| 10 | 40px |
| 12 | 48px |
| 16 | 64px |

### Layout Específico

| Elemento | Valor |
|----------|-------|
| Sidebar Width | 260px |
| Sidebar Collapsed | 72px |
| Header Height | 64px |
| Page Max Width | 1400px |
| Page Gutter | 24px |
| Card Padding | 20px |
| Section Gap | 32px |

---

## Border Radius

| Token | Value | Uso |
|-------|-------|-----|
| sm | 4px | - |
| md | 6px | Badges, Tags |
| lg | 8px | Buttons, Inputs, Cards small |
| xl | 12px | Cards |
| 2xl | 16px | Modals |
| full | 9999px | Avatars, Pills |

---

## Shadows (Dark Theme)

| Token | Value |
|-------|-------|
| xs | `0 1px 2px 0 rgb(0 0 0 / 0.2)` |
| sm | `0 1px 3px 0 rgb(0 0 0 / 0.3)` |
| md | `0 4px 6px -1px rgb(0 0 0 / 0.4)` |
| lg | `0 10px 15px -3px rgb(0 0 0 / 0.5)` |
| Focus Ring | `0 0 0 2px rgb(96 165 250 / 0.5)` |

---

## Breakpoints

| Name | Width |
|------|-------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

---

## Componentes Clave

### Sidebar
- Width: 260px
- BG: slate.800 (`#1E293B`)
- Border: slate.700 (`#334155`)
- Item Hover: slate.700
- Item Active: slate.700 + text blue.400

### Cards
- BG: slate.800 (`#1E293B`)
- Border: slate.700 (`#334155`)
- Radius: 12px
- Padding: 20px
- Shadow: sm

### Buttons

**Primary**
- BG: blue.600 (`#2563EB`)
- Hover: blue.500 (`#3B82F6`)
- Text: white
- Radius: 8px
- Padding: 8px 16px

**Secondary**
- BG: slate.700 (`#334155`)
- Border: slate.600 (`#475569`)
- Text: slate.100 (`#F1F5F9`)

**Ghost**
- BG: transparent
- Hover: slate.700
- Text: slate.300

### Inputs
- BG: slate.800 (`#1E293B`)
- Border: slate.600 (`#475569`)
- Border Focus: blue.500 (`#3B82F6`)
- Radius: 8px
- Padding: 8px 12px

### Toggle Switch
- Track Off: slate.600
- Track On: blue.500
- Thumb: white
- Size: 20px x 36px

---

## Cómo usar en Figma

1. **Variables**: Crea un archivo de variables con los colores
2. **Text Styles**: Crea estilos de texto para cada variant
3. **Effects**: Crea estilos de efecto para shadows
4. **Components**: Construye componentes usando los tokens

### Plugins recomendados
- **Tokens Studio**: Para sincronizar tokens
- **Styler**: Para gestionar estilos
- **Stark**: Para verificar contraste
