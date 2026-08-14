import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StoryboardUploadForm } from "./upload-form";
import { deleteStoryboardFrameAction } from "./actions";

export default async function StoryboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireView("SCRIPT_BREAKDOWN");
  const editable = canEdit(session.user.role, "SCRIPT_BREAKDOWN");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, code: true },
  });
  if (!project) notFound();

  const [frames, scenes] = await Promise.all([
    prisma.storyboardFrame.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
      include: { scene: { select: { number: true } } },
    }),
    prisma.scene.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, number: true, setName: true },
    }),
  ]);
  const sceneOpts = scenes.map((s) => ({ id: s.id, label: `Sc ${s.number} — ${s.setName}` }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Storyboard</h1>
      <p className="font-mono text-sm text-muted-foreground">{project.code}</p>

      <Separator className="my-6" />

      {frames.length === 0 ? (
        <p className="text-sm text-muted-foreground">No storyboard frames yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {frames.map((f) => (
            <div key={f.id} className="overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${f.imageUrl}`}
                alt={f.caption ?? f.imageName}
                className="aspect-video w-full bg-muted object-cover"
              />
              <div className="flex items-start justify-between gap-2 p-2">
                <div className="text-sm">
                  <div>{f.caption ?? f.imageName}</div>
                  {f.scene && (
                    <div className="font-mono text-xs text-muted-foreground">Sc {f.scene.number}</div>
                  )}
                </div>
                {editable && (
                  <form action={deleteStoryboardFrameAction.bind(null, f.id)}>
                    <Button type="submit" variant="ghost" size="sm">✕</Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="mt-6">
          <StoryboardUploadForm projectId={id} scenes={sceneOpts} />
        </div>
      )}
    </div>
  );
}
