// Core UI primitives (with stories + tests)
export { Button } from './Button';
export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';
export { Input } from './Input';
export { Select } from './Select';
export { Card } from './Card';
export { Badge } from './Badge';
export { Avatar } from './Avatar';
export type { AvatarProps, AvatarSize } from './Avatar';
export { Switch } from './Switch';
export { Tabs } from './Tabs';
export { Alert } from './Alert';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { ToastProvider, useToast } from './Toast';
export { Progress } from './Progress';
export type { ProgressProps } from './Progress';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';
export { DataTable } from './DataTable';
export type { Column } from './DataTable';
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';
export { DangerConfirm } from './DangerConfirm';
export type { DangerConfirmProps } from './DangerConfirm';
export { ConnectionStatus } from './ConnectionStatus';
export type { ConnectionStatusProps } from './ConnectionStatus';
export { CollapsibleMenu } from './CollapsibleMenu';
export type { CollapsibleMenuProps } from './CollapsibleMenu';
export { DropdownMenu } from './DropdownMenu';
export type { DropdownMenuProps, DropdownMenuItem } from './DropdownMenu';

// Layout & Page components
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { SidebarLayout } from './SidebarLayout';
export type { SidebarLayoutProps } from './SidebarLayout';
export { Stack } from './Stack';
export type { StackProps } from './Stack';
export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';
export { StatsGrid } from './StatsGrid';
export type { StatsGridProps } from './StatsGrid';
export { PlatformIcon } from './PlatformIcon';
export type { PlatformIconProps } from './PlatformIcon';
export { SettingRow } from './SettingRow';
export type { SettingRowProps } from './SettingRow';
export { DetailsList } from './DetailsList';
export type { DetailsListProps, DetailsItem } from './DetailsList';
export { MetaItem } from './MetaItem';
export type { MetaItemProps } from './MetaItem';
export { NavItem } from './NavItem';
export type { NavItemProps } from './NavItem';

// Typography
export {
  Typography,
  SectionTitle,
  PageTitle,
  Text,
  SmallText,
  Caption,
  TruncatedText,
} from './Typography';
export type { TypographyProps } from './Typography';

// Icon components
export { IconBadge } from './IconBadge';
export type { IconBadgeProps } from './IconBadge';

// Selection & Grid
export { SelectableCard } from './SelectableCard';
export type { SelectableCardProps } from './SelectableCard';
export { Grid } from './Grid';
export type { GridProps } from './Grid';
export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

// Form & Action components
export { Form } from './Form';
export type { FormProps } from './Form';
export { Label } from './Label';
export type { LabelProps } from './Label';
export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';
export { FormActions } from './FormActions';
export type { FormActionsProps } from './FormActions';
export { ToggleGroup } from './ToggleGroup';
export type { ToggleGroupProps, ToggleOption } from './ToggleGroup';

// Auth Layout
export { AuthLayout } from './AuthLayout';
export type { AuthLayoutProps } from './AuthLayout';
export { AuthFooter } from './AuthFooter';
export type { AuthFooterProps } from './AuthFooter';
export { SocialLoginButtons } from './SocialLoginButtons';

// Links
export { TextLink } from './TextLink';
export type { TextLinkProps } from './TextLink';

// Command Palette
export { CommandPalette } from './CommandPalette';
export type {
  CommandItem,
  CommandCategory,
  NavCommandConfig,
} from './CommandPalette';

// Motion / Animations (framer-motion)
export {
  // Variants
  fadeVariants,
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  scaleVariants,
  popVariants,
  staggerContainerVariants,
  staggerItemVariants,
  // Transitions
  springTransition,
  smoothTransition,
  fastTransition,
  // Motion props
  buttonMotionProps,
  cardMotionProps,
  iconButtonMotionProps,
  listItemMotionProps,
  // Components
  FadeIn,
  SlideIn,
  ScaleIn,
  StaggerList,
  StaggerItem,
  AnimatedPresenceWrapper,
  Pulse,
  Shake,
  AnimatedButton,
  AnimatedCard,
  Skeleton,
  Counter,
  // Physics-based animations (react-spring)
  AnimatedNumber,
  AnimatedPercentage,
  AnimatedCurrency,
  AnimatedCompactNumber,
  AnimatedProgress,
  AnimatedCircularProgress,
  // Re-exports
  motion,
  AnimatePresence,
} from './Motion';
export type { Variants, Transition } from './Motion';

// Shared Utilities
export {
  // Animations
  SPRING_SNAPPY,
  SPRING_GENTLE,
  INTERACTIVE_ANIMATION,
  SUBTLE_ANIMATION,
  ICON_BUTTON_ANIMATION,
  PULSE_ANIMATION,
  SPINNER_ANIMATION,
  // Form styles
  FormFieldWrapper,
  FormLabel,
  FormHelperText,
  FormCharCount,
  FormFooter,
  InputContainer,
  InputIconWrapper,
  inputBaseStyles,
  // Focus styles
  focusRing,
  focusRingInset,
  disabledStyles,
  disabledInputStyles,
  // Size presets
  SIZE_HEIGHTS,
  SIZE_FONT_SIZES,
  SIZE_ICON_SIZES,
  SIZE_PADDINGS,
} from './utils';

export type {
  ComponentSize,
  ComponentSizeExtended,
  SurfaceVariant,
  StatusVariant,
  ColorScheme,
  SizeConfig,
} from './utils';
