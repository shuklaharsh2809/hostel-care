import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { addMember, removeMember } from "./actions";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/action-form";
import { Avatar, Badge, Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import type { TeamMember } from "@/lib/types";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  await requireOwner();
  const { members, branches: branchList } = await api<{ members: TeamMember[]; branches: { id: string; name: string }[] }>("/team");

  return (
    <>
      <PageHeader title="Team" description="Give wardens and accountants their own login. Limit them to one branch if needed." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Members" />
          <ul className="divide-y divide-ink-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">{m.name}</p>
                  <p className="truncate text-xs text-ink-500">{m.email}</p>
                </div>
                <Badge tone={m.role === "owner" ? "green" : m.role === "manager" ? "blue" : "gray"}>
                  <span className="capitalize">{m.role}</span>
                </Badge>
                <span className="hidden w-44 truncate text-sm text-ink-500 sm:block">{m.role === "owner" ? "All branches" : (m.branchName ?? "All branches")}</span>
                {m.role !== "owner" ? (
                  <form action={removeMember.bind(null, m.id)}>
                    <ConfirmButton variant="ghost" message={`Remove ${m.name}? They will no longer be able to log in.`} className="px-2!">
                      <Trash2 className="size-4" />
                    </ConfirmButton>
                  </form>
                ) : (
                  <span className="w-8" />
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Add member" />
          <ActionForm action={addMember} resetOnSuccess className="space-y-4 p-5">
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Temporary password" hint="Share it with them privately">
              <Input name="password" type="text" required minLength={8} />
            </Field>
            <Field label="Role" hint="Managers can add/edit students, rooms, mess and invoices. Staff can view only.">
              <Select name="role" defaultValue="manager">
                <option value="manager">Manager</option>
                <option value="staff">Staff (view only)</option>
              </Select>
            </Field>
            <Field label="Branch access">
              <Select name="branchId" defaultValue="">
                <option value="">All branches</option>
                {branchList.map((b) => (
                  <option key={b.id} value={b.id}>
                    Only {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <SubmitButton className="w-full">Add member</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
