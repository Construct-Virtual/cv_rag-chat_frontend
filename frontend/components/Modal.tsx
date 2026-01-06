'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode, type MouseEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  /** ARIA description for the modal content */
  description?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  description,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  // F67: State for managing exit animation
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // F67: Close handler with exit animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for exit animation to complete before calling onClose
    setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, 150); // Match animation duration
  }, [onClose]);

  // Handle opening and closing with animation
  useEffect(() => {
    if (isOpen) {
      // Store the element that was focused before modal opened
      previousActiveElement.current = document.activeElement as HTMLElement;
      setShouldRender(true);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, handleClose]);

  // F89/F92: Focus trap and prevent body scroll
  useEffect(() => {
    if (isOpen && shouldRender) {
      document.body.style.overflow = 'hidden';
      // Focus the close button or the modal itself
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else {
          modalRef.current?.focus();
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
      // Restore focus to previously focused element when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, shouldRender]);

  // F89: Handle keyboard navigation within modal (Tab trap)
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      // Shift + Tab: if on first element, go to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, go to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  if (!shouldRender) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  };

  const modalId = title ? 'modal-title' : undefined;
  const descriptionId = description ? 'modal-description' : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalId}
      aria-describedby={descriptionId}
      onKeyDown={handleKeyDown}
    >
      {/* F67: Backdrop with entrance/exit animation */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm',
          isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
        )}
        aria-hidden="true"
      />

      {/* F67: Modal content with fade + scale entrance/exit animation */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full bg-theme-secondary border border-theme rounded-xl shadow-theme-card',
          isClosing ? 'animate-modal-content-out' : 'animate-modal-content-in',
          sizeStyles[size]
        )}
        tabIndex={-1}
        role="document"
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-theme-primary">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="p-1 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Close modal"
                type="button"
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Optional description for screen readers */}
        {description && (
          <p id="modal-description" className="sr-only">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
