import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from "ag-grid-community";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

/** Dark single-column list theme — rows carry their own custom UI. */
const ledgerGridTheme = themeQuartz.withParams({
  backgroundColor: "#1a1a1a",
  foregroundColor: "#f2f2f2",
  borderColor: "transparent",
  cellTextColor: "#f2f2f2",
  rowHoverColor: "rgba(255, 255, 255, 0.05)",
  selectedRowBackgroundColor: "#3a3a3a",
  fontFamily: "Roboto, system-ui, sans-serif",
  fontSize: 14,
  cellHorizontalPadding: 0,
  browserColorScheme: "dark",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  rowBorder: { style: "none" },
});

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

/**
 * ag-grid backed list. Every item is exactly one row with one full-width
 * custom cell, so the existing dark chat-style UI is preserved while ag-grid
 * handles virtualisation and scrolling.
 */
export default function ListGrid<T>({
  rows,
  getRowId,
  renderRow,
  rowHeight = 64,
  autoScrollToBottom = false,
  scrollKey,
  className,
}: ListGridProps<T>) {
  const apiRef = useRef<GridApi<T> | null>(null);
  const [ready, setReady] = useState(false);
  // Keep the column definition stable; the renderer always calls the latest
  // callback without forcing ag-grid to rebuild its columns.
  const renderRowRef = useRef(renderRow);
  renderRowRef.current = renderRow;

  const columnDefs = useMemo<ColDef<T>[]>(
    () => [
      {
        colId: "row",
        flex: 1,
        minWidth: 0,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: (params: CustomCellRendererProps<T>) => (
          <div className="ledger-grid-row">{renderRowRef.current(params.data as T)}</div>
        ),
      },
    ],
    [],
  );

  const getRowHeight = useMemo(
    () => (params: { data?: T }) => {
      if (!params.data) return typeof rowHeight === "number" ? rowHeight : 64;
      return typeof rowHeight === "function" ? rowHeight(params.data) : rowHeight;
    },
    [rowHeight],
  );

  useEffect(() => {
    if (autoScrollToBottom && ready && apiRef.current && rows.length > 0) {
      apiRef.current.ensureIndexVisible(rows.length - 1, "bottom");
    }
  }, [rows.length, autoScrollToBottom, scrollKey, ready]);

  return (
    <div className={cn("ledger-grid min-h-0 flex-1", className)}>
      <AgGridReact<T>
        theme={ledgerGridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        getRowId={(params) => getRowId(params.data)}
        getRowHeight={getRowHeight}
        headerHeight={0}
        animateRows={false}
        suppressCellFocus
        rowBuffer={10}
        onGridReady={(event: GridReadyEvent<T>) => {
          apiRef.current = event.api;
          setReady(true);
        }}
      />
    </div>
  );
}
