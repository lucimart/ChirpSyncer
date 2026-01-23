'use client';

import styled from 'styled-components';
import { ReactNode, useEffect, useCallback, useRef, useId, memo, FC } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { ModalProps, MODAL_SIZE_MAP, MODAL_ANIMATION } from './types';
import { useFocusTrap } from './useFocusTrap';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
  z-index: 50;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ModalContainer = styled(motion.div)<{ $size: string }>`
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  max-width: ${({ $size }) => $size};
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  outline: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${({ theme }) => theme.spacing[1]} 0 0 0;
`;

const CloseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const ModalBase: FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  trapFocus = true,
  returnFocusOnClose = true,
  initialFocusRef,
  finalFocusRef,
  preserveScrollBarGap = true,
  'data-testid': testId,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const shouldReduceMotion = useReducedMotion();

  // Focus trap
  useFocusTrap({
    enabled: isOpen && trapFocus,
    containerRef,
    initialFocusRef,
    finalFocusRef,
    returnFocusOnClose,
  });

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (preserveScrollBarGap && scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown, preserveScrollBarGap]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  const animationProps = shouldReduceMotion
    ? MODAL_ANIMATION.reducedMotion
    : MODAL_ANIMATION.content;

  const overlayProps = shouldReduceMotion
    ? MODAL_ANIMATION.reducedMotion
    : MODAL_ANIMATION.overlay;

  // Portal rendering
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <Overlay
          key="modal-overlay"
          onClick={handleOverlayClick}
          initial={overlayProps.initial}
          animate={overlayProps.animate}
          exit={overlayProps.exit}
          transition={overlayProps.transition}
        >
          <ModalContainer
            ref={containerRef}
            $size={MODAL_SIZE_MAP[size]}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            data-testid={testId}
            className={className}
            initial={animationProps.initial}
            animate={animationProps.animate}
            exit={animationProps.exit}
            transition={animationProps.transition}
          >
            {title && (
              <Header>
                <div>
                  <Title id={titleId}>{title}</Title>
                  {description && (
                    <Description id={descriptionId}>{description}</Description>
                  )}
                </div>
                <CloseButton
                  onClick={onClose}
                  aria-label="Close modal"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={20} aria-hidden="true" />
                </CloseButton>
              </Header>
            )}
            {!title && (
              <VisuallyHidden>
                <button onClick={onClose} aria-label="Close modal">
                  Close
                </button>
              </VisuallyHidden>
            )}
            <Content>{children}</Content>
            {footer && <Footer>{footer}</Footer>}
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>,
    document.body
  );
};

ModalBase.displayName = 'ModalBase';

// Convenience sub-components
const ModalFooter: FC<{ children: ReactNode }> = memo(({ children }) => (
  <Footer>{children}</Footer>
));
ModalFooter.displayName = 'ModalFooter';

// Memoized modal with sub-component
export const Modal = Object.assign(memo(ModalBase), {
  Footer: ModalFooter,
});

Modal.displayName = 'Modal';
