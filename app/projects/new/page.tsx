import Link from "next/link";
import { requireEdit } from "@/lib/require-access";
import { createProjectAction } from "../actions";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage() {
  await requireEdit("PROJECT");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/projects" className="text-sm text-muted-foreground hover:underline">
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New project</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A project code (PRJ-{new Date().getFullYear()}-###) is assigned on save.
      </p>
      <ProjectForm action={createProjectAction} submitLabel="Create project" />
    </div>
  );
}
