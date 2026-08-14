import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { SCENE_INT_LABEL, SCENE_TIME_LABEL, formatEighths } from "@/lib/breakdown";

// Kept out of the component so the render stays pure (no new Date() in render).
function generatedOn() {
  return format(new Date(), "dd MMM yyyy HH:mm");
}

export default async function CallSheetPage({
  params,
}: {
  params: Promise<{ id: string; shootDayId: string }>;
}) {
  const { id, shootDayId } = await params;
  await requireView("CALL_SHEETS");

  const day = await prisma.shootDay.findUnique({
    where: { id: shootDayId },
    include: {
      project: { select: { title: true, code: true } },
      location: true,
      scenes: { orderBy: { dayOrder: "asc" }, include: { elements: true } },
      crew: {
        include: { contact: { select: { name: true, role: true, department: true, phone: true } } },
      },
    },
  });
  if (!day || day.projectId !== id) notFound();

  // Cast for the day = distinct CAST elements across the day's scenes.
  const cast = Array.from(
    new Set(
      day.scenes.flatMap((s) =>
        s.elements.filter((e) => e.category === "CAST").map((e) => e.name),
      ),
    ),
  );

  return (
    <div className="mx-auto max-w-3xl bg-white px-10 py-10 text-[#191919] print:px-0 print:py-0">
      {/* Brand header */}
      <div className="bg-hc-gradient -mx-10 -mt-10 mb-8 px-10 py-6 print:mx-0 print:mt-0">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
              Call Sheet · Day {day.dayNumber}
            </div>
            <div className="font-heading text-3xl font-extrabold text-white">hoichoi</div>
          </div>
          <div className="text-right text-white">
            <div className="font-semibold">{day.project.title}</div>
            <div className="font-mono text-xs text-white/70">{day.project.code}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#888]">Date</div>
          <div className="font-semibold">{day.date ? format(day.date, "EEE dd MMM yyyy") : "TBC"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#888]">General call</div>
          <div className="font-mono font-semibold">{day.generalCallTime ?? "TBC"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[#888]">Unit</div>
          <div className="font-semibold">{day.unit ?? "Main Unit"}</div>
        </div>
      </div>

      {day.location && (
        <div className="mt-4 rounded-md bg-[#f5f5f5] p-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-[#888]">Location</div>
          <div className="font-semibold">{day.location.name}</div>
          {day.location.address && <div className="text-[#666]">{day.location.address}</div>}
          {(day.location.contactName || day.location.contactPhone) && (
            <div className="text-xs text-[#666]">
              {day.location.contactName}
              {day.location.contactPhone ? ` · ${day.location.contactPhone}` : ""}
            </div>
          )}
        </div>
      )}

      {/* Scenes */}
      <h2 className="mt-8 border-b-2 border-[#191919] pb-1 text-sm font-bold uppercase tracking-wide">
        Scenes
      </h2>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-[#888]">
            <th className="py-1">Sc</th>
            <th className="py-1">I/E</th>
            <th className="py-1">Set</th>
            <th className="py-1">D/N</th>
            <th className="py-1 text-right">Pages</th>
          </tr>
        </thead>
        <tbody>
          {day.scenes.length === 0 ? (
            <tr><td colSpan={5} className="py-2 text-[#888]">No scenes scheduled.</td></tr>
          ) : (
            day.scenes.map((s) => (
              <tr key={s.id} className="border-b border-[#eee]">
                <td className="py-1 font-mono">{s.number}</td>
                <td className="py-1">{SCENE_INT_LABEL[s.intExt]}</td>
                <td className="py-1">{s.setName}{s.synopsis ? ` — ${s.synopsis}` : ""}</td>
                <td className="py-1">{SCENE_TIME_LABEL[s.time]}</td>
                <td className="py-1 text-right font-mono">{formatEighths(s.pageEighths)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Cast */}
      {cast.length > 0 && (
        <>
          <h2 className="mt-8 border-b-2 border-[#191919] pb-1 text-sm font-bold uppercase tracking-wide">
            Cast
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {cast.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </>
      )}

      {/* Crew */}
      <h2 className="mt-8 border-b-2 border-[#191919] pb-1 text-sm font-bold uppercase tracking-wide">
        Crew call
      </h2>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-[#888]">
            <th className="py-1">Name</th>
            <th className="py-1">Role</th>
            <th className="py-1">Dept</th>
            <th className="py-1">Phone</th>
            <th className="py-1 text-right">Call</th>
          </tr>
        </thead>
        <tbody>
          {day.crew.length === 0 ? (
            <tr><td colSpan={5} className="py-2 text-[#888]">No crew called.</td></tr>
          ) : (
            day.crew.map((c) => (
              <tr key={c.id} className="border-b border-[#eee]">
                <td className="py-1">{c.contact.name}</td>
                <td className="py-1">{c.contact.role ?? "—"}</td>
                <td className="py-1">{c.contact.department ?? "—"}</td>
                <td className="py-1 font-mono">{c.contact.phone ?? "—"}</td>
                <td className="py-1 text-right font-mono">
                  {c.callTime ?? day.generalCallTime ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {day.notes && (
        <p className="mt-6 text-xs text-[#666]">
          <span className="font-semibold">Notes: </span>{day.notes}
        </p>
      )}

      <div className="mt-12 text-right text-xs text-[#888]">Generated {generatedOn()}</div>
    </div>
  );
}
