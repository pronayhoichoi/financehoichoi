import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { SCENE_INT_LABEL, SCENE_TIME_LABEL } from "@/lib/breakdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreateShootDayForm,
  AssignSceneControl,
  AddCrewForm,
} from "./schedule-forms";
import {
  deleteShootDayAction,
  removeCrewCallAction,
  unassignSceneAction,
} from "./actions";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("SCHEDULE");
  const editable = canEdit(session.user.role, "SCHEDULE");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, code: true },
  });
  if (!project) notFound();

  const [shootDays, allScenes, contacts, locations] = await Promise.all([
    prisma.shootDay.findMany({
      where: { projectId: id },
      orderBy: { dayNumber: "asc" },
      include: {
        location: { select: { name: true } },
        scenes: { orderBy: { dayOrder: "asc" }, include: { elements: true } },
        crew: { include: { contact: { select: { name: true, role: true } } } },
      },
    }),
    prisma.scene.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
      include: { elements: true },
    }),
    prisma.contact.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { projectId: id }, select: { id: true, name: true } }),
  ]);

  const unscheduled = allScenes
    .filter((s) => !s.shootDayId)
    .map((s) => ({ id: s.id, label: `Sc ${s.number} — ${s.setName}` }));
  const contactOpts = contacts.map((c) => ({
    id: c.id,
    label: c.role ? `${c.name} (${c.role})` : c.name,
  }));

  // Day-out-of-days: distinct CAST element names × shoot days.
  const castNames = Array.from(
    new Set(
      allScenes.flatMap((s) =>
        s.elements.filter((e) => e.category === "CAST").map((e) => e.name),
      ),
    ),
  ).sort();
  const castOnDay = (name: string, dayId: string) =>
    shootDays
      .find((d) => d.id === dayId)!
      .scenes.some((s) => s.elements.some((e) => e.category === "CAST" && e.name === name));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Shooting Schedule</h1>
      <p className="font-mono text-sm text-muted-foreground">{project.code}</p>

      <Separator className="my-6" />

      <div className="flex flex-col gap-4">
        {shootDays.length === 0 && (
          <p className="text-sm text-muted-foreground">No shoot days yet.</p>
        )}

        {shootDays.map((day) => (
          <div key={day.id} className="rounded-md border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-semibold">Day {day.dayNumber}</h2>
                  {day.date && (
                    <span className="text-sm text-muted-foreground">
                      {format(day.date, "EEE dd MMM yyyy")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[day.unit, day.location?.name, day.generalCallTime && `Call ${day.generalCallTime}`]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${id}/schedule/${day.id}/callsheet`} target="_blank">
                    Call sheet
                  </Link>
                </Button>
                {editable && (
                  <form action={deleteShootDayAction.bind(null, day.id)}>
                    <Button type="submit" variant="ghost" size="sm">✕</Button>
                  </form>
                )}
              </div>
            </div>

            {/* Scenes */}
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Scenes
              </div>
              {day.scenes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scenes assigned.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {day.scenes.map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span>
                        <span className="font-mono">Sc {s.number}</span> · {SCENE_INT_LABEL[s.intExt]}.{" "}
                        {s.setName} — {SCENE_TIME_LABEL[s.time]}
                      </span>
                      {editable && (
                        <form action={unassignSceneAction.bind(null, s.id)}>
                          <Button type="submit" variant="ghost" size="sm">remove</Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {editable && (
                <div className="mt-2">
                  <AssignSceneControl shootDayId={day.id} unscheduled={unscheduled} />
                </div>
              )}
            </div>

            {/* Crew calls */}
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Crew calls
              </div>
              {day.crew.length === 0 ? (
                <p className="text-sm text-muted-foreground">No crew called.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {day.crew.map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span>
                        {c.contact.name}
                        {c.contact.role ? ` · ${c.contact.role}` : ""}
                        {c.callTime ? ` · call ${c.callTime}` : ""}
                      </span>
                      {editable && (
                        <form action={removeCrewCallAction.bind(null, c.id)}>
                          <Button type="submit" variant="ghost" size="sm">remove</Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {editable && (
                <div className="mt-2">
                  <AddCrewForm shootDayId={day.id} contacts={contactOpts} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editable && (
        <div className="mt-4">
          <CreateShootDayForm projectId={id} locations={locations} />
        </div>
      )}

      {unscheduled.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {unscheduled.length} scene{unscheduled.length === 1 ? "" : "s"} not yet scheduled.
        </p>
      )}

      {castNames.length > 0 && shootDays.length > 0 && (
        <>
          <Separator className="my-6" />
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Day-out-of-days (cast)
            </h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium">Cast</th>
                    {shootDays.map((d) => (
                      <th key={d.id} className="p-2 text-center font-medium">D{d.dayNumber}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {castNames.map((name) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="p-2">{name}</td>
                      {shootDays.map((d) => (
                        <td key={d.id} className="p-2 text-center">
                          {castOnDay(name, d.id) ? (
                            <Badge className="bg-hc-success text-white">W</Badge>
                          ) : (
                            <span className="text-muted-foreground">·</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              W = working that day (cast member appears in a scene scheduled on that day).
            </p>
          </section>
        </>
      )}
    </div>
  );
}
