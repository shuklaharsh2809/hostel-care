import { Trash2 } from "lucide-react";
import Link from "next/link";
import { createRoom, deleteRoom, updateBranch } from "../actions";
import { assignRoom } from "../../students/actions";
import { RoomMap } from "@/components/room-map";
import { BranchFields } from "../branch-fields";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/action-form";
import { Badge, ButtonLink, Card, CardHeader, Field, Input, Notice, PageHeader, Select, StatCard, Table, Td, Th } from "@/components/ui";
import { apiOrNotFound } from "@/lib/api";
import { canManage, requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import type { BranchDetail } from "@/lib/types";

export default async function BranchDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; view?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error, view } = await searchParams;
  const showTable = view === "table";
  const {
    branch,
    rooms: roomRows,
    activeStudents,
    studentsWithoutRoom: unassigned,
    unassignedStudents,
  } = await apiOrNotFound<BranchDetail>(`/branches/${id}`);
  const beds = roomRows.reduce((s, r) => s + r.capacity, 0);
  const vacant = roomRows.reduce((s, r) => s + Math.max(0, r.capacity - r.occupants.length), 0);
  const manage = canManage(user);

  return (
    <>
      <PageHeader
        back={{ href: "/app/branches", label: "All branches" }}
        title={branch.name}
        description={[branch.address, branch.city].filter(Boolean).join(", ") || undefined}
        actions={
          <>
            <ButtonLink href={`/app/students?branch=${id}`} variant="secondary">
              View students
            </ButtonLink>
            {branch.hasMess && (
              <ButtonLink href={`/app/mess?branch=${id}`} variant="secondary">
                Mess
              </ButtonLink>
            )}
            <ButtonLink href={`/app/students/new?branch=${id}`}>Add student</ButtonLink>
          </>
        }
      />
      {error === "room-occupied" && (
        <div className="mb-6">
          <Notice tone="error">That room still has active students. Move them to another room first.</Notice>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rooms" value={roomRows.length} />
        <StatCard label="Total beds" value={beds} />
        <StatCard label="Active students" value={activeStudents} hint={unassigned ? `${unassigned} without a room` : undefined} tone="sky" />
        <StatCard label="Vacant beds" value={vacant} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Rooms"
            description="Beds, rent and who's staying"
            action={
              <div className="flex rounded-lg bg-ink-100 p-0.5 text-xs font-medium">
                {[
                  ["map", "Bed map"],
                  ["table", "Table"],
                ].map(([v, label]) => (
                  <Link
                    key={v}
                    href={`/app/branches/${id}${v === "table" ? "?view=table" : ""}`}
                    className={(showTable ? v === "table" : v === "map") ? "rounded-md bg-white px-2.5 py-1 text-ink-900 shadow-sm" : "rounded-md px-2.5 py-1 text-ink-500 hover:text-ink-800"}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            }
          />
          {!showTable ? (
            <RoomMap
              branchId={id}
              rooms={roomRows}
              unassigned={unassignedStudents}
              canManage={manage}
              assign={async (studentId, roomId) => {
                "use server";
                return assignRoom(studentId, roomId, id);
              }}
            />
          ) : (
          <Table>
            <thead>
              <tr>
                <Th>Room</Th>
                <Th>Type</Th>
                <Th>Beds</Th>
                <Th>Occupants</Th>
                <Th className="text-right">Rent / bed</Th>
                {manage && <Th />}
              </tr>
            </thead>
            <tbody>
              {roomRows.map((r) => {
                const occ = r.occupants;
                const full = occ.length >= r.capacity;
                return (
                  <tr key={r.id}>
                    <Td>
                      <span className="font-semibold text-ink-900">{r.number}</span>
                      <span className="block text-xs text-ink-500">{r.floor}</span>
                    </Td>
                    <Td className="capitalize">{r.roomType}</Td>
                    <Td>
                      <Badge tone={full ? "gray" : "green"}>
                        {occ.length}/{r.capacity} {full ? "full" : "free"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {occ.map((s) => (
                          <Link key={s.id} href={`/app/students/${s.id}`} className="rounded bg-ink-100 px-1.5 py-0.5 text-xs hover:bg-brand-100">
                            {s.name}
                          </Link>
                        ))}
                        {occ.length === 0 && <span className="text-xs text-ink-400">Empty</span>}
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">{money(r.monthlyRent)}</Td>
                    {manage && (
                      <Td className="w-10">
                        <form action={deleteRoom.bind(null, r.id, id)}>
                          <ConfirmButton variant="ghost" message={`Delete room ${r.number}?`} className="px-2!">
                            <Trash2 className="size-4" />
                          </ConfirmButton>
                        </form>
                      </Td>
                    )}
                  </tr>
                );
              })}
              {roomRows.length === 0 && (
                <tr>
                  <Td colSpan={6} className="py-10 text-center text-ink-500">
                    No rooms yet. Add your first room using the form.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
          )}
        </Card>

        <div className="space-y-6">
          {manage && (
            <Card>
              <CardHeader title="Add room" />
              <ActionForm action={createRoom.bind(null, id)} resetOnSuccess className="grid grid-cols-2 gap-4 p-5">
                <Field label="Room no.">
                  <Input name="number" required placeholder="101" />
                </Field>
                <Field label="Floor">
                  <Input name="floor" placeholder="Floor 1" />
                </Field>
                <Field label="Type">
                  <Select name="roomType" defaultValue="double">
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                    <option value="dormitory">Dormitory</option>
                  </Select>
                </Field>
                <Field label="Beds">
                  <Input name="capacity" type="number" min={1} max={20} defaultValue={2} required />
                </Field>
                <Field label="Monthly rent per bed (₹)" className="col-span-2">
                  <Input name="monthlyRent" inputMode="decimal" placeholder="7000" required />
                </Field>
                <SubmitButton className="col-span-2">Add room</SubmitButton>
              </ActionForm>
            </Card>
          )}
          {user.role === "owner" && (
            <Card>
              <CardHeader title="Branch details" />
              <ActionForm action={updateBranch.bind(null, id)} className="space-y-4 p-5">
                <BranchFields branch={branch} />
                <SubmitButton variant="secondary" className="w-full">
                  Save changes
                </SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
