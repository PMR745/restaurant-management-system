"use client";

import { toast } from "sonner";
import { STAFF_ROLE_LABEL } from "@/lib/domain/enums";
import { assignWaiter } from "@/lib/store/actions";
import { useStaff, useTableViews } from "@/lib/store/hooks";
import { SelectField } from "@/components/ui/field";
import { Initials, Skeleton } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeading, Surface } from "@/components/ui/surface";
import { HydrationGate } from "@/components/providers";

export function StaffBoard() {
  return (
    <HydrationGate fallback={<StaffSkeleton />}>
      <StaffContent />
    </HydrationGate>
  );
}

function StaffContent() {
  const staff = useStaff();
  const views = useTableViews();
  const waiters = staff.filter((s) => s.role === "waiter");

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <SectionHeading
        eyebrow="Team"
        title="On shift"
        description="Assign sections here, or from any table on the floor map."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((member) => {
          const section = views.filter(
            (v) => v.table.assignedWaiterId === member.id,
          );
          const needsRunner = section.filter((v) => v.status === "ready").length;

          return (
            <Surface key={member.id} variant="flat" className="p-4">
              <div className="flex items-center gap-3">
                <Initials initials={member.initials} className="size-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{member.name}</p>
                  <p className="text-2xs uppercase tracking-label text-ink-4">
                    {STAFF_ROLE_LABEL[member.role]}
                  </p>
                </div>
                {needsRunner ? (
                  <StatusPill status="ready" label={`${needsRunner} ready`} size="sm" />
                ) : null}
              </div>

              {member.role === "waiter" ? (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-2xs uppercase tracking-label text-ink-4">
                    Section · {section.length}{" "}
                    {section.length === 1 ? "table" : "tables"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {section.length ? (
                      section.map((v) => (
                        <span
                          key={v.table.id}
                          data-status={v.status}
                          className="inline-flex items-center gap-1.5 rounded-xs border border-[--st-stroke] bg-[--st-tint] px-2 py-1 font-mono text-2xs tabular text-[--st]"
                        >
                          {v.table.code}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-4">No tables assigned</span>
                    )}
                  </div>
                </div>
              ) : null}
            </Surface>
          );
        })}
      </div>

      <section>
        <SectionHeading eyebrow="Assignment" title="Sections" />
        <Surface variant="flat" className="mt-5 divide-y divide-line">
          {views.map((v) => (
            <div key={v.table.id} className="flex items-center gap-4 px-4 py-3">
              <span className="w-12 shrink-0 font-display text-lg font-light text-ink">
                {v.table.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink-2">
                {v.table.label}
              </span>
              <StatusPill status={v.status} size="sm" className="shrink-0" />
              <SelectField
                ariaLabel={`Waiter for ${v.table.code}`}
                className="w-44 shrink-0"
                value={v.table.assignedWaiterId ?? "none"}
                onValueChange={(val) => {
                  void assignWaiter(
                    v.table.id,
                    val === "none" ? null : val,
                  ).then(() =>
                    toast.success(
                      val === "none"
                        ? `${v.table.code} unassigned`
                        : `${v.table.code} → ${waiters.find((w) => w.id === val)?.name}`,
                    ),
                  );
                }}
                options={[
                  { value: "none", label: "Unassigned" },
                  ...waiters.map((w) => ({ value: w.id, label: w.name })),
                ]}
              />
            </div>
          ))}
        </Surface>
      </section>
    </div>
  );
}

function StaffSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-36" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-md" />
        ))}
      </div>
    </div>
  );
}
