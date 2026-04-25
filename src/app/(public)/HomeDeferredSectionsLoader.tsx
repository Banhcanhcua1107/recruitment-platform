"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

interface FeaturedJobCardData {
  id?: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  tag: string;
}

type HomeDeferredSectionsComponent = ComponentType<{
  featuredJobs: FeaturedJobCardData[];
}>;

function DeferredSectionsPlaceholder() {
  return <div className="min-h-96 bg-[#f6f7f8]" aria-hidden="true" />;
}

export default function HomeDeferredSectionsLoader({
  featuredJobs,
}: {
  featuredJobs: FeaturedJobCardData[];
}) {
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [DeferredSections, setDeferredSections] =
    useState<HomeDeferredSectionsComponent | null>(null);

  useEffect(() => {
    if (shouldLoad) {
      return;
    }

    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let observer: IntersectionObserver | null = null;
    const reveal = () => setShouldLoad(true);

    if ("IntersectionObserver" in window && placeholderRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            reveal();
            observer?.disconnect();
          }
        },
        { rootMargin: "720px" }
      );
      observer.observe(placeholderRef.current);
    }

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(reveal, { timeout: 2500 });
    } else {
      timeoutHandle = setTimeout(reveal, 1800);
    }

    return () => {
      observer?.disconnect();
      if (idleHandle !== null) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    };
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || DeferredSections) {
      return;
    }

    let cancelled = false;

    void import("./HomeDeferredSections").then((module) => {
      if (!cancelled) {
        setDeferredSections(() => module.default);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [DeferredSections, shouldLoad]);

  if (!shouldLoad) {
    return <div ref={placeholderRef}><DeferredSectionsPlaceholder /></div>;
  }

  if (!DeferredSections) {
    return <DeferredSectionsPlaceholder />;
  }

  return <DeferredSections featuredJobs={featuredJobs} />;
}
