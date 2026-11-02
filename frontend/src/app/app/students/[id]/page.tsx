import Link from "next/link";
import type { ReactNode } from "react";
import { removeStudentPhoto, setStudentStatus, uploadStudentPhoto } from "../actions";
import { ConfirmButton } from "@/components/action-form";
import { PhotoUploader } from "@/components/photo-uploader";
import { Avatar, Badge, ButtonLink, Card, CardHeader, InvoiceStatusBadge, Notice, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { apiOrNotFound } from "@/lib/api";
import { canManage, requireUser } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import { studentPhoto } from "@/lib/photo";
import type { StudentDetail as StudentDetailData } from "@/lib/types";

export default async function StudentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { created } = await searchParams;
  const { student: s, branch, room, plan, invoices: invoiceRows } = await apiOrNotFound<StudentDetailData>(`/students/${id}`);
  const billed = invoiceRows.filter((i) => i.status !== "void").reduce((a, i) => a + i.total, 0);
  const paid = invoiceRows.filter((i) => i.status !== "void").reduce((a, i) => a + i.amountPaid, 0);
  const manage = canManage(user);

  return (
    <>
      <PageHeader
        back={{ href: "/app/students", label: "Students" }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={s.fullName} src={studentPhoto(s.id, s.photoUrl)} className="size-11 text-sm" />
            {s.fullName}
            {s.status === "left" ? <Badge>Left {formatDate(s.leaveDate)}</Badge> : <Badge tone="green">Staying</Badge>}
          </span>
        }
        actions={
          manage && (
            <>
              <ButtonLink href={`/app/students/${id}/edit`} variant="secondary">
                Edit
              </ButtonLink>
              <form action={setStudentStatus.bind(null, id, s.status === "active" ? "left" : "active")}>
                <ConfirmButton
                  variant="secondary"
                  message={s.status === "active" ? `Mark ${s.fullName} as left? Their bed will be freed.` : `Mark ${s.fullName} as staying again?`}
                >
                  {s.status === "active" ? "Mark as left" : "Re-admit"}
                </ConfirmButton>
              </form>
              <ButtonLink href={`/app/invoices/new?student=${id}`}>Create invoice</ButtonLink>
            </>
          )
        }
      />
      {created && (
        <div className="mb-6">
          <Notice tone="success">Student added successfully.</Notice>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total billed" value={money(billed)} />
        <StatCard label="Total paid" value={money(paid)} tone="sky" />
        <StatCard label="Balance due" value={money(billed - paid)} tone={billed - paid > 0 ? "rose" : "brand"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5">
            <PhotoUploader
              name={s.fullName}
              src={studentPhoto(s.id, s.photoUrl)}
              canEdit={manage}
              upload={uploadStudentPhoto.bind(null, s.id)}
              remove={removeStudentPhoto.bind(null, s.id)}
            />
          </Card>
          <Card>
            <CardHeader title="Stay" />
            <Dl
              items={[
                ["Branch", <Link key="b" className="text-brand-700 hover:underline" href={`/app/branches/${branch.id}`}>{branch.name}</Link>],
                ["Room", room ? `Room ${room.number} (${room.roomType})` : "Not assigned"],
                ["Mess plan", plan ? `${plan.name} · ${money(plan.monthlyFee)}/mo` : "No mess"],
                ["Monthly rent", money(s.monthlyRent)],
                ["Security deposit", money(s.securityDeposit)],
                ["Joined", formatDate(s.joinDate)],
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Guardian" />
            <Dl
              items={[
                ["Name", s.guardianName],
                ["Relation", s.guardianRelation],
                ["Phone", s.guardianPhone],
              ]}
            />
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Personal details" />
            <div className="grid sm:grid-cols-2">
              <Dl
                items={[
                  ["Phone", s.phone],
                  ["Email", s.email],
                  ["Gender", s.gender && <span className="capitalize">{s.gender}</span>],
                  ["Date of birth", s.dateOfBirth && formatDate(s.dateOfBirth)],
                  ["Blood group", s.bloodGroup],
                ]}
              />
              <Dl
                items={[
                  ["College", s.institution],
                  ["Course", s.course],
                  ["ID proof", s.idProofType && `${s.idProofType} · ${s.idProofNumber ?? ""}`],
                  ["Address", s.permanentAddress],
                  ["Notes", s.notes],
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Invoices" description={`${invoiceRows.length} total`} />
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Period</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Due</Th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-ink-50/50">
                    <Td>
                      <Link href={`/app/invoices/${inv.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                        {inv.number}
                      </Link>
                      <span className="block text-xs text-ink-500">{formatDate(inv.issueDate)}</span>
                    </Td>
                    <Td>{inv.periodLabel ?? "—"}</Td>
                    <Td>
                      <InvoiceStatusBadge status={inv.status} />
                    </Td>
                    <Td className="text-right tabular-nums">{money(inv.total)}</Td>
                    <Td className="text-right tabular-nums">{inv.status === "void" ? "—" : money(inv.total - inv.amountPaid)}</Td>
                  </tr>
                ))}
                {invoiceRows.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-ink-500">
                      No invoices yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </>
  );
}

function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-ink-100">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-5 py-2.5 text-sm">
          <dt className="shrink-0 text-ink-500">{k}</dt>
          <dd className="text-right text-ink-900">{v || <span className="text-ink-400">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
