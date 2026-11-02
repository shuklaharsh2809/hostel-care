"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { api, ApiError, attempt } from "@/lib/api";
import { toPaise } from "@/lib/format";
import type { Branch, Room } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function branchBody(fd: FormData) {
  return {
    name: str(fd, "name"),
    code: str(fd, "code"),
    city: str(fd, "city") || null,
    address: str(fd, "address") || null,
    phone: str(fd, "phone") || null,
    wardenName: str(fd, "wardenName") || null,
    hasMess: fd.get("hasMess") === "on",
  };
}

export async function createBranch(_: FormState, fd: FormData): Promise<FormState> {
  let id = "";
  const res = await attempt(async () => {
    id = (await api<Branch>("/branches", { method: "POST", body: branchBody(fd) })).id;
  });
  if (res?.error) return res;
  redirect(`/app/branches/${id}`);
}

export async function updateBranch(branchId: string, _: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    await api(`/branches/${branchId}`, { method: "PATCH", body: branchBody(fd) });
    revalidatePath(`/app/branches/${branchId}`);
    return { success: "Branch details saved" };
  });
}

export async function createRoom(branchId: string, _: FormState, fd: FormData): Promise<FormState> {
  return attempt(async () => {
    const room = await api<Room>(`/branches/${branchId}/rooms`, {
      method: "POST",
      body: {
        number: str(fd, "number"),
        floor: str(fd, "floor") || null,
        roomType: str(fd, "roomType") || "double",
        capacity: Number(fd.get("capacity")) || 1,
        monthlyRent: toPaise(fd.get("monthlyRent")),
      },
    });
    revalidatePath(`/app/branches/${branchId}`);
    return { success: `Room ${room.number} added` };
  });
}

export async function deleteRoom(roomId: string, branchId: string) {
  try {
    await api(`/rooms/${roomId}`, { method: "DELETE" });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) redirect(`/app/branches/${branchId}?error=room-occupied`);
    throw e;
  }
  revalidatePath(`/app/branches/${branchId}`);
}
