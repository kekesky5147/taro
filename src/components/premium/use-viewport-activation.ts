"use client";

import { useCallback, useEffect, useState } from "react";

type UseViewportActivationOptions = {
  threshold?: number;
  rootMargin?: string;
};

function isElementInViewport(el: HTMLElement, ratio = 0.1): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const visibleHeight = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
  if (visibleHeight <= 0) return false;
  return visibleHeight / rect.height >= ratio || rect.top < vh * 0.85;
}

/**
 * Returns true once the observed element enters the viewport (fires once).
 */
export function useViewportActivation({
  threshold = 0.1,
  rootMargin = "0px",
}: UseViewportActivationOptions = {}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [isActivated, setIsActivated] = useState(false);

  const ref = useCallback((el: HTMLDivElement | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node || isActivated) return;

    const activate = () => setIsActivated(true);

    if (isElementInViewport(node, threshold)) {
      activate();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          activate();
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, isActivated, threshold, rootMargin]);

  return { ref, isActivated };
}
