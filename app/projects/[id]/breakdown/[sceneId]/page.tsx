import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { SCENE_INT_LABEL, SCENE_TIME_LABEL, formatEighths } from "@/lib/breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ElementEditor } from "../element-editor";
import { ShotEditor } from "./shot-editor";
import { deleteSceneAction } from "../actions";

export default async function ScenePage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { id, sceneId } = await params;
  const session = await requireView("SCRIPT_BREAKDOWN");
  const editable = canEdit(session.user.role, "SCRIPT_BREAKDOWN");

  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: {
      elements: true,
      shots: { orderBy: { sortOrder: "asc" } },
      project: { select: { id: true, title: true, currency: true } },
    },
  });
  if (!scene || scene.projectId !== id) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/projects/${id}/breakdown`} className="text-sm text-muted-foreground hover:underline">
        ← Breakdown · {scene.project.title}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scene {scene.number}</h1>
          <p className="text-sm text-muted-foreground">
            {SCENE_INT_LABEL[scene.intExt]}. {scene.setName} — {SCENE_TIME_LABEL[scene.time]}
          </p>
        </div>
        <Badge variant="outline" className="font-mono">
          {formatEighths(scene.pageEighths)} pg
        </Badge>
      </div>

      {scene.synopsis && <p className="mt-3 text-sm">{scene.synopsis}</p>}

      <Separator className="my-6" />

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Elements</h2>
      {editable ? (
        <ElementEditor
          sceneId={scene.id}
          currency={scene.project.currency}
          initialRows={scene.elements.map((e) => ({
            category: e.category,
            name: e.name,
            qty: String(e.qty),
            estimatedCost: e.estimatedCost != null ? String(e.estimatedCost) : "",
            notes: e.notes ?? "",
          }))}
        />
      ) : scene.elements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No elements tagged.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {scene.elements.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-4 py-2">
              <span>
                <Badge variant="secondary" className="mr-2">{e.category}</Badge>
                {e.name} {e.qty > 1 && `×${e.qty}`}
              </span>
              <span className="font-mono text-muted-foreground">
                {e.estimatedCost != null
                  ? `${scene.project.currency} ${Number(e.estimatedCost).toLocaleString("en-IN")}`
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Separator className="my-6" />

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Shot list</h2>
      {editable ? (
        <ShotEditor
          sceneId={scene.id}
          initialRows={scene.shots.map((s) => ({
            number: s.number,
            shotSize: s.shotSize ?? "",
            angle: s.angle ?? "",
            movement: s.movement ?? "",
            gear: s.gear ?? "",
            description: s.description ?? "",
          }))}
        />
      ) : scene.shots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shots planned.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {scene.shots.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2">
              <span className="font-mono">{s.number}</span>
              {s.shotSize && <Badge variant="secondary">{s.shotSize}</Badge>}
              <span className="text-muted-foreground">
                {[s.angle, s.movement, s.gear, s.description].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <>
          <Separator className="my-6" />
          <form action={deleteSceneAction.bind(null, scene.id)}>
            <Button type="submit" variant="outline" size="sm">
              Delete scene
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
