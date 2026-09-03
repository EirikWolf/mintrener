import { useEffect, useRef, RefObject } from 'react';

interface FocusTrapOptions {
  isActive?: boolean;
  onClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
  if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
  return true;
}

/**
 * Universell fokusfelle for modaler (WCAG 2.1 AA / WAI-ARIA Dialog Modal).
 * Fanger tab-fokus innenfor modalen, lytter på Escape-tast for lukking,
 * og gjenoppretter fokus til utløsende element når modalen lukkes.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  containerRef: RefObject<T | null>,
  options: FocusTrapOptions = {}
): void {
  const { isActive = true, onClose, initialFocusRef } = options;
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // 1. Husk hvilket element som hadde fokus før modalen åpnet
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Sett initialt fokus
    const container = containerRef.current;
    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(isFocusable);

    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      container.focus();
    }

    // 3. Håndter Tab-sykling og Escape-tast
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const currentFocusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(isFocusable);

      if (currentFocusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = currentFocusables[0];
      const lastEl = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl || !container.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl || !container.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    // 4. Gjenopprett fokus ved demontering / lukking
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isActive, onClose, initialFocusRef, containerRef]);
}
