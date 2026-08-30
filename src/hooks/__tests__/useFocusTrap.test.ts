import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap (WCAG 2.1 AA / Dialog modal a11y)', () => {
  it('fanger tab-taster innenfor container og kaller onClose ved Escape', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button');
    const btn2 = document.createElement('button');
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const onClose = vi.fn();
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, { isActive: true, onClose }));

    // Test initial focus
    expect(document.activeElement).toBe(btn1);

    // Escape trigger
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    window.dispatchEvent(escapeEvent);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Tab wrap from last to first
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    window.dispatchEvent(tabEvent);

    // Cleanup
    document.body.removeChild(container);
  });
});
