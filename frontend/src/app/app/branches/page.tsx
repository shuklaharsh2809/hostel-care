import { Building2, MapPin, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createBranch } from "./actions";
import { BranchFields } from "./branch-fields";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import type { BranchWithCounts } from "@/lib/types";

export const metadata: Metadata = { title: "Branches" };

export default async function BranchesPage() {
  const user = await requireUser();
  const rows = await api<BranchWithCounts[]>("/branches");

  return (
    <>
      <PageHeader title="Branches & Rooms" description="Each branch has its own rooms, students, mess and billing." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:self-start">
          {rows.map((b) => {
            const c = b;
            const pct = c.beds ? Math.round((c.students / c.beds) * 100) : 0;
            return (
              <Link key={b.id} href={`/app/branches/${b.id}`} className="group">
                <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Building2 className="size-5" />
                    </span>
                    <div className="flex gap-1.5">
                      {b.hasMess && (
                        <Badge tone="amber">
                          <UtensilsCrossed className="mr-1 size-3" /> Mess
                        </Badge>
                      )}
                      <Badge>{b.code}</Badge>
                    </div>
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-ink-900 group-hover:text-brand-700">{b.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
                    <MapPin className="size-3.5" /> {[b.address, b.city].filter(Boolean).join(", ") || "No address"}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Rooms", c.rooms],
                      ["Beds", c.beds],
                      ["Students", c.students],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-ink-50 py-2">
                        <p className="font-display text-lg font-bold tabular-nums">{v}</p>
                        <p className="text-xs text-ink-500">{k}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-ink-500">{pct}% full</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {user.role === "owner" && (
          <Card className="lg:self-start">
            <CardHeader title="Add a branch" description="Open a new hostel location" />
            <ActionForm action={createBranch} className="space-y-4 p-5">
              <BranchFields />
              <SubmitButton className="w-full">Add branch</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
