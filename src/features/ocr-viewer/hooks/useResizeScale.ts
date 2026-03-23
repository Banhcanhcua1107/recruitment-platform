"use client";

import { useEffect, useRef, useState } from "react";

export function useResizeScale<T extends HTMLElement>(originalWidth: number, originalHeight: number) {
  const targetRef = useRef<T | null>(null);
  const [displayedWidth, setDisplayedWidth] = useState(0);
  const [displayedHeight, setDisplayedHeight] = useState(0);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setDisplayedWidth(rect.width);
      setDisplayedHeight(rect.height);
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [originalWidth, originalHeight]);

  return {
    targetRef,
    displayedWidth,
    displayedHeight,
    scaleX: originalWidth > 0 ? displayedWidth / originalWidth : 1,
    scaleY: originalHeight > 0 ? displayedHeight / originalHeight : 1,
  };
}
