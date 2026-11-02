"use client";

import { useMemo, useState } from "react";
import { ActionForm, SubmitButton, type FormAction } from "@/components/action-form";
import { Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import type { Student } from "@/lib/types";

type Opt = { id: string; name: string };
type RoomOpt = { id: string; branchId: string; number: string; capacity: number; occupied: number; monthlyRent: number };
type PlanOpt = { id: string; branchId: string; name: string; monthlyFee: number };

export function StudentForm({
  action,
  branches,
  rooms,
  plans,
  student,
  defaultBranchId,
  submitLabel,
}: {
  action: FormAction;
  branches: Opt[];
  rooms: RoomOpt[];
  plans: PlanOpt[];
  student?: Student;
  defaultBranchId?: string;
  submitLabel: string;
}) {
  const [branchId, setBranchId] = useState(student?.branchId ?? defaultBranchId ?? branches[0]?.id ?? "");
  const [rent, setRent] = useState(student ? String(student.monthlyRent / 100) : "");
  const branchRooms = useMemo(() => rooms.filter((r) => r.branchId === branchId), [rooms, branchId]);
  const branchPlans = useMemo(() => plans.filter((p) => p.branchId === branchId), [plans, branchId]);
  const v = (k: keyof Student) => (student?.[k] as string | null | undefined) ?? "";

  return (
    <ActionForm action={action} className="space-y-6">
      <Card>
        <CardHeader title="Personal details" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name" className="sm:col-span-2">
            <Input name="fullName" required defaultValue={v("fullName")} />
          </Field>
          <Field label="Gender">
            <Select name="gender" defaultValue={v("gender")}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input name="dateOfBirth" type="date" defaultValue={v("dateOfBirth")} />
          </Field>
          <Field label="Phone">
            <Input name="phone" type="tel" defaultValue={v("phone")} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={v("email")} />
          </Field>
          <Field label="Blood group">
            <Select name="bloodGroup" defaultValue={v("bloodGroup")}>
              <option value="">—</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="College / institution">
            <Input name="institution" defaultValue={v("institution")} />
          </Field>
          <Field label="Course / year">
            <Input name="course" defaultValue={v("course")} />
          </Field>
          <Field label="Permanent address" className="sm:col-span-2 lg:col-span-3">
            <Textarea name="permanentAddress" rows={2} defaultValue={v("permanentAddress")} />
          </Field>
          <Field label="ID proof type">
            <Select name="idProofType" defaultValue={v("idProofType")}>
              <option value="">—</option>
              {["Aadhaar", "PAN", "Passport", "Driving Licence", "Voter ID", "College ID"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="ID proof number">
            <Input name="idProofNumber" defaultValue={v("idProofNumber")} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Guardian / emergency contact" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Guardian name">
            <Input name="guardianName" defaultValue={v("guardianName")} />
          </Field>
          <Field label="Relation">
            <Input name="guardianRelation" placeholder="Father, Mother…" defaultValue={v("guardianRelation")} />
          </Field>
          <Field label="Guardian phone">
            <Input name="guardianPhone" type="tel" defaultValue={v("guardianPhone")} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Stay, mess & fees" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Branch">
            <Select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Room" hint="Only rooms with free beds are selectable">
            <Select
              key={branchId}
              name="roomId"
              defaultValue={student?.branchId === branchId ? v("roomId") : ""}
              onChange={(e) => {
                const r = branchRooms.find((x) => x.id === e.target.value);
                if (r && !rent) setRent(String(r.monthlyRent / 100));
              }}
            >
              <option value="">Not assigned</option>
              {branchRooms.map((r) => {
                const mine = student?.roomId === r.id;
                const free = r.capacity - r.occupied + (mine ? 1 : 0);
                return (
                  <option key={r.id} value={r.id} disabled={free <= 0}>
                    Room {r.number} — {Math.max(free, 0)} of {r.capacity} free
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Mess plan">
            <Select key={branchId} name="messPlanId" defaultValue={student?.branchId === branchId ? v("messPlanId") : ""}>
              <option value="">No mess</option>
              {branchPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{(p.monthlyFee / 100).toLocaleString("en-IN")}/mo
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Joining date">
            <Input name="joinDate" type="date" defaultValue={v("joinDate")} />
          </Field>
          <Field label="Monthly rent (₹)" hint="Auto-filled from the room">
            <Input name="monthlyRent" inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} />
          </Field>
          <Field label="Security deposit (₹)">
            <Input name="securityDeposit" inputMode="decimal" defaultValue={student ? student.securityDeposit / 100 : ""} />
          </Field>
          <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
            <Textarea name="notes" rows={2} defaultValue={v("notes")} placeholder="Allergies, special requests, documents pending…" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton className="px-6">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
