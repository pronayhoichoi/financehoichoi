import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/require-access";
import { canEdit } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MoodUploadForm } from "./upload-form";
import { deleteMoodImageAction } from "./actions";

export default async function MoodBoardPage({
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

  const images = await prisma.moodBoardImage.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← {project.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Mood Board</h1>
      <p className="font-mono text-sm text-muted-foreground">{project.code}</p>

      <Separator className="my-6" />

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${img.imageUrl}`}
                alt={img.caption ?? img.imageName}
                className="aspect-square w-full bg-muted object-cover"
              />
              <div className="flex items-start justify-between gap-2 p-2">
                <span className="text-sm">{img.caption ?? img.imageName}</span>
                {editable && (
                  <form action={deleteMoodImageAction.bind(null, img.id)}>
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
          <MoodUploadForm projectId={id} />
        </div>
      )}
    </div>
  );
}
