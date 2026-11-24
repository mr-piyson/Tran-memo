import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface ListGridProps<T> {
  rows: T[];
  getRowId: (data: T) => string;
  renderRow: (data: T) => ReactNode;
  rowHeight?: number | ((data: T) => number);
  autoScrollToBottom?: boolean;
  /** Change this to re-scroll after switching to a different list. */
  scrollKey?: string | number;
  className?: string;
}

/** Virtualized single-column list: one row per item, each row rendering its own UI. */
export default function ListGrid<T>({
  rows,
  getRowId,
  renderRow,
  rowHeight = 64,
  autoScrollToBottom = false,
  scrollKey,
  className,
}: ListGridProps<T>) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [scrollReady, setScrollReady] = useState(false);
  // Keep the renderer latest without rebuilding the virtualizer options.
  const renderRowRef = useRef(renderRow);
  renderRowRef.current = renderRow;

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    setScrollEl(node);
    setScrollReady(node !== null);
  }, []);

  const estimateSize = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row === undefined) return typeof rowHeight === "number" ? rowHeight : 64;
      return typeof rowHeight === "function" ? rowHeight(row) : rowHeight;
    },
    [rows, rowHeight],
  );

  const getItemKey = useCallback(
    (index: number) => {
      const row = rows[index];
      return row === undefined ? index : getRowId(row);
    },
    [rows, getRowId],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize,
    getItemKey,
    overscan: 10,
  });

  const scrollStateRef = useRef<{
    key: string | number | undefined;
    firstKey: string | number | undefined;
    count: number;
    total: number;
  } | null>(null);

  // Overlay dialogs paint after their popup mounts, so the scroll element is
  // null on the first render. Nudge the virtualizer once it is ready (and
  // re-arm when the list unmounts) so rows are measured and rendered.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (!scrollReady) {
      didInitialScroll.current = false;
      return;
    }
    if (rows.length === 0 || didInitialScroll.current) return;
    didInitialScroll.current = true;
    virtualizer.scrollToIndex(0);
  }, [scrollReady, rows.length, virtualizer]);

  useEffect(() => {
    const total = virtualizer.getTotalSize();
    if (!scrollReady || rows.length === 0) {
      scrollStateRef.current = null;
      return;
    }
    const firstRow = rows[0];
    const firstKey = firstRow === undefined ? undefined : getRowId(firstRow);
    const previous = scrollStateRef.current;
    scrollStateRef.current = { key: scrollKey, firstKey, count: rows.length, total };

    // Older pages are prepended: preserve the reader's position instead of
    // yanking them to the bottom.
    if (previous && previous.firstKey !== firstKey) {
      if (scrollEl) scrollEl.scrollTop += total - previous.total;
      return;
    }

    if (!autoScrollToBottom) return;
    if (!previous || previous.key !== scrollKey || rows.length > previous.count) {
      virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
    }
  }, [autoScrollToBottom, scrollReady, rows, scrollKey, getRowId, virtualizer, scrollEl]);

  return (
    <div ref={setScrollRef} className={cn("min-h-0 w-full flex-1 overflow-y-auto", className)}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index];
          if (row === undefined) return null;
          return (
            <div
              key={item.key}
              className="absolute top-0 left-0 flex w-full items-center [&>*]:w-full hover:bg-overlay-hover"
              style={{ height: item.size, transform: `translateY(${item.start}px)` }}
            >
              {renderRowRef.current(row)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
