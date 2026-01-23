/**
 * UI Component Utilities
 *
 * Shared utilities, styles, and types for UI components.
 */

// Animations
export {
  SPRING_SNAPPY,
  SPRING_GENTLE,
  SPRING_BOUNCY,
  TWEEN_FAST,
  TWEEN_NORMAL,
  INTERACTIVE_ANIMATION,
  SUBTLE_ANIMATION,
  ICON_BUTTON_ANIMATION,
  PULSE_ANIMATION,
  FADE_IN,
  FADE_IN_UP,
  SPINNER_ANIMATION,
} from './animations';

// Form styles
export {
  FormFieldWrapper,
  FormLabel,
  FormHelperText,
  FormCharCount,
  FormFooter,
  InputContainer,
  InputIconWrapper,
  inputBaseStyles,
} from './formStyles';

// Focus and state styles
export {
  focusRing,
  focusRingInset,
  focusRingError,
  disabledStyles,
  disabledInputStyles,
  loadingStyles,
  interactiveHover,
  subtleHover,
} from './focusStyles';

// Types
export type {
  ComponentSize,
  ComponentSizeExtended,
  ComponentSizeFull,
  SurfaceVariant,
  StatusVariant,
  ButtonVariant,
  ColorScheme,
  IconPosition,
  SizeConfig,
  TextSizeConfig,
} from './types';

export {
  SIZE_HEIGHTS,
  SIZE_FONT_SIZES,
  SIZE_ICON_SIZES,
  SIZE_PADDINGS,
} from './types';
