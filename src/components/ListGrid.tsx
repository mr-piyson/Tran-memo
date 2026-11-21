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

  // biome-ignore lint/correctness/useExhaustiveDependencies: scrollKey re-triggers autoscroll when switching lists of equal length
  useEffect(() => {
    if (!autoScrollToBottom || !scrollReady || rows.length === 0) return;
    virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
  }, [autoScrollToBottom, scrollReady, rows.length, scrollKey, virtualizer]);

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
