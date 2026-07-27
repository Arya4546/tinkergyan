import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  /** Inline styles applied to the trigger wrapper (e.g. to preserve a caller's absolute positioning). */
  style?: React.CSSProperties;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 100,
  className = '',
  style,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 120;
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 32;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + 8;
        break;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 8) left = 8;
    if (left + tooltipWidth > viewportWidth - 8) {
      left = viewportWidth - tooltipWidth - 8;
    }
    if (top < 8) top = rect.bottom + 8;
    if (top + tooltipHeight > viewportHeight - 8) {
      top = rect.top - tooltipHeight - 8;
    }

    setCoords({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;
    const id = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible || !tooltipRef.current) return;
    const id = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(id);
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (isVisible) {
      const id = requestAnimationFrame(() => {
        setShouldRender(true);
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return () => cancelAnimationFrame(id);
    } else {
      const id = requestAnimationFrame(() => {
        setIsAnimating(false);
      });
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 150);
      return () => {
        cancelAnimationFrame(id);
        clearTimeout(timer);
      };
    }
  }, [isVisible]);

  if (!content) return <>{children}</>;

  const getTransformClass = () => {
    if (isAnimating) return 'opacity-100 scale-100 translate-x-0 translate-y-0';
    switch (position) {
      case 'top':
        return 'opacity-0 scale-95 translate-y-1';
      case 'bottom':
        return 'opacity-0 scale-95 -translate-y-1';
      case 'left':
        return 'opacity-0 scale-95 translate-x-1';
      case 'right':
        return 'opacity-0 scale-95 -translate-x-1';
      default:
        return 'opacity-0 scale-95';
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>
      {shouldRender &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              pointerEvents: 'none',
              zIndex: 99999,
              transition:
                'opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={`
              px-2.5 py-1.5 text-xs font-semibold font-sans tracking-wide whitespace-nowrap
              bg-slate-950/95 dark:bg-slate-900/95 text-slate-100 dark:text-slate-100
              border border-slate-800/80 dark:border-slate-700/80 rounded-lg shadow-xl backdrop-blur-md
              transform origin-center ${getTransformClass()}
            `}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
