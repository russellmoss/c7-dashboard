import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Staff {
  name: string;
  orders: number;
  guests: number;
  revenue: number;
  bottles: number;
  clubSignups: number;
  wineBottleConversionRate: number;
  clubConversionRate: number;
  wineBottleConversionGoalVariance: number;
  clubConversionGoalVariance: number;
  aov: number;
}


export function useSortableTable<T>(
  data: T[],
  columns: { key: keyof T; label: string; isNumeric?: boolean }[],
) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    // Treat null, undefined, NaN, 'n/a', and non-numeric as lowest
    const isMissing = (v: any) =>
      v == null ||
      v === "n/a" ||
      v === "N/A" ||
      v === "" ||
      (typeof v === "number" && isNaN(v)) ||
      (typeof v === "string" && v.includes("NaN"));
    if (isMissing(aValue) && isMissing(bValue)) return 0;
    if (isMissing(aValue)) return 1;
    if (isMissing(bValue)) return -1;
    // Numeric sort
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    }
    // Try to parse as number if possible (for values like '12%' or 'NaN%')
    const parseNum = (v: any) => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const num = parseFloat(v.replace(/[^\d.-]/g, ""));
        return isNaN(num) ? null : num;
      }
      return null;
    };
    const aNum = parseNum(aValue);
    const bNum = parseNum(bValue);
    if (aNum != null && bNum != null) {
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }
    // Fallback to string sort
    return sortOrder === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  function handleSort(key: keyof T) {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  return { sortedData, sortKey, sortOrder, handleSort };
}

const staffColumns: { key: keyof Staff; label: string; isNumeric?: boolean }[] =
  [
    { key: "name", label: "Name" },
    { key: "orders", label: "Orders", isNumeric: true },
    { key: "guests", label: "Guests", isNumeric: true },
    { key: "revenue", label: "Revenue", isNumeric: true },
    { key: "bottles", label: "Bottles", isNumeric: true },
    { key: "clubSignups", label: "Club Signups", isNumeric: true },
    {
      key: "wineBottleConversionRate",
      label: "Wine Conv. Rate",
      isNumeric: true,
    },
    { key: "clubConversionRate", label: "Club Conv. Rate", isNumeric: true },
    { key: "aov", label: "AOV", isNumeric: true }, // <-- NEW COLUMN
  ];

export function StaffTable({ staff }: { staff: Staff[] }) {
  const { sortedData, sortKey, sortOrder, handleSort } = useSortableTable(
    staff,
    staffColumns,
  );
  const [search, setSearch] = useState("");
  const filteredData = sortedData.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="overflow-x-auto bg-card rounded-lg shadow-sm">
      <div className="flex p-2">
        <div className="w-[180px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search associate name..."
            className="border border-input rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-wine-400 bg-background text-foreground"
            style={{ minWidth: 0, width: "100%" }}
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {staffColumns.map((col, idx) => (
              <TableHead
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={
                  "cursor-pointer select-none group text-card-foreground dark:text-red-400 font-semibold" +
                  (idx === 0 ? " relative" : "")
                }
              >
                <span className="flex items-center">
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-xs">
                      {sortOrder === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={staffColumns.length}
                className="text-center text-muted-foreground py-6"
              >
                No associates found.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((s) => (
              <TableRow key={s.name}>
                <TableCell className="font-medium text-card-foreground">
                  {s.name}
                </TableCell>
                <TableCell className="text-card-foreground">{s.orders}</TableCell>
                <TableCell className="text-card-foreground">{s.guests}</TableCell>
                <TableCell className="text-card-foreground">${s.revenue.toLocaleString()}</TableCell>
                <TableCell className="text-card-foreground">{s.bottles}</TableCell>
                <TableCell className="text-card-foreground">{s.clubSignups}</TableCell>
                <TableCell>
                  <span className="text-card-foreground">
                    {s.wineBottleConversionRate != null
                      ? `${s.wineBottleConversionRate}%`
                      : "-"}
                  </span>
                  {s.wineBottleConversionGoalVariance != null && (
                    <span
                      className={
                        s.wineBottleConversionGoalVariance >= 0
                          ? "ml-2 text-green-600 dark:text-green-400 font-semibold"
                          : "ml-2 text-red-600 dark:text-red-400 font-semibold"
                      }
                    >
                      {s.wineBottleConversionGoalVariance >= 0
                        ? `▲ ${s.wineBottleConversionGoalVariance}%`
                        : `▼ ${Math.abs(s.wineBottleConversionGoalVariance)}%`}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-card-foreground">
                    {s.clubConversionRate != null
                      ? `${s.clubConversionRate}%`
                      : "-"}
                  </span>
                  {s.clubConversionGoalVariance != null && (
                    <span
                      className={
                        s.clubConversionGoalVariance >= 0
                          ? "ml-2 text-green-600 dark:text-green-400 font-semibold"
                          : "ml-2 text-red-600 dark:text-red-400 font-semibold"
                      }
                    >
                      {s.clubConversionGoalVariance >= 0
                        ? `▲ ${s.clubConversionGoalVariance}%`
                        : `▼ ${Math.abs(s.clubConversionGoalVariance)}%`}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-card-foreground">
                    {s.aov != null ? `$${s.aov.toLocaleString()}` : "-"}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
