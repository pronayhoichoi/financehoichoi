"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PROJECT_TYPES, PROJECT_STATUSES } from "@/lib/validation/project";
import type { ProjectActionState } from "./actions";

type Defaults = {
  title?: string;
  type?: string;
  genre?: string | null;
  status?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  businessUnit?: string | null;
  producer?: string | null;
  currency?: string;
  commissioned?: boolean;
};

function iso(d?: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

function FieldError({
  errors,
  name,
}: {
  errors?: Record<string, string[]>;
  name: string;
}) {
  const msg = errors?.[name]?.[0];
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

const STATUS_LABEL: Record<string, string> = {
  PRE_PRODUCTION: "Pre-production",
  PRODUCTION: "Production",
  POST: "Post",
  RELEASED: "Released",
  ARCHIVED: "Archived",
};

export function ProjectForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (
    prev: ProjectActionState,
    formData: FormData,
  ) => Promise<ProjectActionState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    ProjectActionState,
    FormData
  >(action, {});
  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" defaultValue={defaults.title ?? ""} />
          <FieldError errors={fe} name="title" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type *</Label>
          <select
            id="type"
            name="type"
            defaultValue={defaults.type ?? PROJECT_TYPES[0]}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status *</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status ?? PROJECT_STATUSES[0]}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="genre">Genre</Label>
          <Input id="genre" name="genre" defaultValue={defaults.genre ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="producer">Producer</Label>
          <Input id="producer" name="producer" defaultValue={defaults.producer ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={iso(defaults.startDate)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={iso(defaults.endDate)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="businessUnit">Business unit</Label>
          <Input id="businessUnit" name="businessUnit" defaultValue={defaults.businessUnit ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue={defaults.currency ?? "INR"} />
        </div>
        <label className="flex items-center gap-2 md:col-span-2">
          <Checkbox name="commissioned" defaultChecked={defaults.commissioned ?? false} />
          <span className="text-sm">Commissioned / line-production project</span>
        </label>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
