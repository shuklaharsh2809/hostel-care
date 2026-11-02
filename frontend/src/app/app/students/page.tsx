import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { api } from "@/lib/api";
import type { BranchWithCounts, Paged, StudentListRow } from "@/lib/types";
import { formatDate, money } from "@/lib/format";

export const metadata: Metadata = { title: "Students" };
const PAGE_SIZE = 25;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; branch?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const [{ rows, total }, branchList] = await Promise.all([
    api<Paged<StudentListRow>>("/students", {
      query: { q, branch: sp.branch, status: ["active", "left", "all"].includes(sp.status ?? "") ? sp.status : "active", page, pageSize: PAGE_SIZE },
    }),
    api<BranchWithCounts[]>("/branches"),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (sp.branch) u.set("branch", sp.branch);
    if (sp.status) u.set("status", sp.status);
    u.set("page", String(p));
    return `?${u}`;
  };

  return (
    <>
      <PageHeader title="Students" description={`${total} student${total === 1 ? "" : "s"}`} actions={<ButtonLink href="/app/students/new">Add student</ButtonLink>} />
      <Card>
        <form className="flex flex-wrap gap-3 border-b border-ink-100 p-4">
          <Input name="q" defaultValue={q} placeholder="Search name, phone, email, college, room…" className="min-w-56 flex-1" />
          <Select name="branch" defaultValue={sp.branch ?? ""} className="w-auto">
            <option value="">All branches</option>
            {branchList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={sp.status ?? "active"} className="w-auto">
            <option value="active">Currently staying</option>
            <option value="left">Left</option>
            <option value="all">All</option>
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
        {rows.length === 0 ? (
          <EmptyState
            title="No students found"
            description={q || sp.branch ? "Try a different search or filter." : "Add your first student to get started."}
            action={<ButtonLink href="/app/students/new">Add student</ButtonLink>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Branch · Room</Th>
                <Th>College</Th>
                <Th>Mess</Th>
                <Th>Joined</Th>
                <Th className="text-right">Dues</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50/50">
                  <Td>
                    <Link href={`/app/students/${s.id}`} className="flex items-center gap-3">
                      <Avatar name={s.fullName} />
                      <span>
                        <span className="font-medium text-ink-900 hover:text-brand-700">{s.fullName}</span>
                        <span className="block text-xs text-ink-500">{s.phone ?? "—"}</span>
                      </span>
                      {s.status === "left" && <Badge>Left</Badge>}
                    </Link>
                  </Td>
                  <Td>
                    <Badge>{s.branchCode}</Badge> <span className="ml-1">{s.roomNumber ? `Room ${s.roomNumber}` : <span className="text-ink-400">No room</span>}</span>
                  </Td>
                  <Td>
                    <span className="block max-w-48 truncate">{s.institution ?? "—"}</span>
                    <span className="block text-xs text-ink-500">{s.course}</span>
                  </Td>
                  <Td>{s.messPlan ? <span className="text-sm">{s.messPlan}</span> : <span className="text-ink-400">—</span>}</Td>
                  <Td className="whitespace-nowrap">{formatDate(s.joinDate)}</Td>
                  <Td className="text-right tabular-nums">
                    {s.dues > 0 ? <span className="font-medium text-red-700">{money(s.dues)}</span> : <span className="text-ink-400">₹0</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 text-sm text-ink-500">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <ButtonLink variant="secondary" href={qs(page - 1)}>
                  Previous
                </ButtonLink>
              )}
              {page < pages && (
                <ButtonLink variant="secondary" href={qs(page + 1)}>
                  Next
                </ButtonLink>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
