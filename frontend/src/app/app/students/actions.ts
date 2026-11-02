"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { api, attempt } from "@/lib/api";
import { toPaise } from "@/lib/format";
import type { Student } from "@/lib/types";

const TEXT_FIELDS = [
  "fullName",
  "gender",
  "dateOfBirth",
  "phone",
  "email",
  "bloodGroup",
  "institution",
  "course",
  "permanentAddress",
  "idProofType",
  "idProofNumber",
  "guardianName",
  "guardianRelation",
  "guardianPhone",
  "branchId",
  "roomId",
  "messPlanId",
  "joinDate",
  "notes",
] as const;

function studentBody(fd: FormData) {
  const body: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) body[k] = String(fd.get(k) ?? "").trim() || null;
  body.monthlyRent = toPaise(fd.get("monthlyRent"));
  body.securityDeposit = toPaise(fd.get("securityDeposit"));
  return body;
}

export async function createStudent(_: FormState, fd: FormData): Promise<FormState> {
  let id = "";
  const res = await attempt(async () => {
    id = (await api<Student>("/students", { method: "POST", body: studentBody(fd) })).id;
  });
  if (res?.error) return res;
  redirect(`/app/students/${id}?created=1`);
}

export async function updateStudent(studentId: string, _: FormState, fd: FormData): Promise<FormState> {
  const res = await attempt(async () => {
    await api(`/students/${studentId}`, { method: "PATCH", body: studentBody(fd) });
  });
  if (res?.error) return res;
  redirect(`/app/students/${studentId}`);
}

export async function setStudentStatus(studentId: string, status: "active" | "left") {
  await api(`/students/${studentId}/status`, { method: "POST", body: { status } });
  revalidatePath(`/app/students/${studentId}`);
}

export async function uploadStudentPhoto(studentId: string, fd: FormData): Promise<FormState> {
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload" };
  const res = await attempt(async () => {
    const body = new FormData();
    body.set("photo", file, file.name || "photo.jpg");
    await api(`/students/${studentId}/photo`, { method: "POST", body });
  });
  if (res?.error) return res;
  revalidatePath(`/app/students/${studentId}`);
  return { success: "Photo updated" };
}

export async function removeStudentPhoto(studentId: string): Promise<FormState> {
  const res = await attempt(async () => {
    await api(`/students/${studentId}/photo`, { method: "DELETE" });
  });
  if (res?.error) return res;
  revalidatePath(`/app/students/${studentId}`);
  return { success: "Photo removed" };
}

export async function assignRoom(studentId: string, roomId: string | null, branchId: string): Promise<FormState> {
  const res = await attempt(async () => {
    await api(`/students/${studentId}/room`, { method: "POST", body: { roomId } });
  });
  if (res?.error) return res;
  revalidatePath(`/app/branches/${branchId}`);
  return { success: roomId ? "Room assigned" : "Removed from room" };
}
