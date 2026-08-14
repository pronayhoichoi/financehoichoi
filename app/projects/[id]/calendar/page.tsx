import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Default month kept out of the component so render stays pure.
function defaultYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftYm(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const idx = (y * 12 + (m - 1)) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { id } = await params;
  const { ym: ymRaw } = await searchParams;
  await requireView("SCHEDULE");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, code: true },
  });
  if (!project) notFound();

  const ym = /^\d{4}-\d{2}$/.test(ymRaw ?? "") ? ymRaw! : defaultYm();
  const [year, month] = ym.split("-").map(Number); // month 1-12

  const monthStart = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = monthStart.getDay(); // 0=Sun

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month - 1, daysInMonth, 23, 59, 59);

  const [shootDays, tasks] = await Promise.all([
    prisma.shootDay.findMany({
      where: { projectId: id, date: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, dayNumber: true, date: true },
    }),
    prisma.task.findMany({
      where: { projectId: id, dueDate: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, title: true, dueDate: true, status: true },
    }),
  ]);

  const cells: (number | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsFor = (day: number) => {
    const sds = shootDays.filter((s) => s.date && s.date.getDate() === day);
    const tks = tasks.filter((t) => t.dueDate && t.dueDate.getDate() === day);
    return { sds, tks };
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Production Calendar</h1>
          <p className="font-mono text-sm text-muted-foreground">{project.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`?ym=${shiftYm(ym, -1)}`}>←</Link>
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold">
            {MONTHS[month - 1]} {year}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`?ym=${shiftYm(ym, 1)}`}>→</Link>
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-sm">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          const ev = day ? eventsFor(day) : { sds: [], tks: [] };
          return (
            <div key={i} className="min-h-24 bg-card p-1.5 align-top">
              {day && (
                <>
                  <div className="text-xs text-muted-foreground">{day}</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {ev.sds.map((s) => (
                      <Badge key={s.id} className="bg-hc-gradient block w-fit text-white">
                        Day {s.dayNumber}
                      </Badge>
                    ))}
                    {ev.tks.map((t) => (
                      <span
                        key={t.id}
                        className="block truncate rounded bg-muted px-1 text-xs"
                        title={t.title}
                      >
                        • {t.title}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Shoot days and task due-dates for this project. Use ← → to change month.
      </p>
    </div>
  );
}
