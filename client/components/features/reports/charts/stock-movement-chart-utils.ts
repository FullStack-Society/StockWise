import { formatDate } from "@/lib/utils/format";

export type GroupBy = "day" | "week" | "month" | "year";

export const GROUP_LABELS: Record<GroupBy, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

export function bucketDate(day: string, groupBy: GroupBy) {
  const date = new Date(`${day}T00:00:00Z`);
  if (groupBy === "week") {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  } else if (groupBy === "month") {
    date.setUTCDate(1);
  } else if (groupBy === "year") {
    date.setUTCMonth(0, 1);
  }
  return date.toISOString().slice(0, 10);
}

export function bucketLabel(
  day: string,
  groupBy: GroupBy,
  dateFormat: "mdy" | "dmy" | "ymd",
) {
  if (groupBy === "year") return day.slice(0, 4);
  const date = new Date(`${day}T00:00:00Z`);
  if (groupBy === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  const formatted = formatDate(day, dateFormat);
  return groupBy === "week" ? `Week of ${formatted}` : formatted;
}

export function axisLabel(
  day: string,
  groupBy: GroupBy,
  dateFormat: "mdy" | "dmy" | "ymd",
) {
  if (groupBy === "year") return day.slice(0, 4);
  const [year, month, date] = day.split("-");
  if (groupBy === "month") {
    return (
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${day}T00:00:00Z`)) + ` '${year.slice(-2)}`
    );
  }
  const shortDate =
    dateFormat === "dmy"
      ? `${date}/${month}`
      : dateFormat === "ymd"
        ? `${year.slice(-2)}-${month}-${date}`
        : `${month}/${date}`;
  return groupBy === "week" ? `Wk ${shortDate}` : shortDate;
}

export function linePath(
  values: number[],
  max: number,
  plot: { left: number; right: number; top: number; bottom: number },
) {
  if (!values.length) return "";
  const width = plot.right - plot.left;
  const height = plot.bottom - plot.top;
  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? (plot.left + plot.right) / 2
          : plot.left + (index * width) / (values.length - 1);
      const y = plot.bottom - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}
