"use client";

import { ArrowRightLeft, BedDouble, LogOut, Plus, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { studentPhoto } from "@/lib/photo";
import type { Occupant, RoomWithOccupants } from "@/lib/types";
import type { FormState } from "./action-form";
import { Avatar, Button, Input, cx } from "./ui";

type Assign = (studentId: string, roomId: string | null) => Promise<FormState>;

type Target =
  | { kind: "free"; room: RoomWithOccupants }
  | { kind: "occupied"; room: RoomWithOccupants; student: Occupant }
  | { kind: "move"; room: RoomWithOccupants; student: Occupant };

export function RoomMap({
  branchId,
  rooms,
  unassigned,
  canManage,
  assign,
}: {
  branchId: string;
  rooms: RoomWithOccupants[];
  unassigned: Occupant[];
  canManage: boolean;
  assign: Assign;
}) {
  const [onlyFree, setOnlyFree] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [pending, start] = useTransition();

  const floors = useMemo(() => {
    const map = new Map<string, RoomWithOccupants[]>();
    for (const r of rooms) {
      if (onlyFree && r.occupants.length >= r.capacity) continue;
      const f = r.floor || "Other rooms";
      map.set(f, [...(map.get(f) ?? []), r]);
    }
    return [...map.entries()];
  }, [rooms, onlyFree]);

  const beds = rooms.reduce((s, r) => s + r.capacity, 0);
  const taken = rooms.reduce((s, r) => s + Math.min(r.occupants.length, r.capacity), 0);

  function run(studentId: string, roomId: string | null, done: string) {
    start(async () => {
      const res = await assign(studentId, roomId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(done);
        setTarget(null);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-ink-600">
            <span className="size-3 rounded border border-brand-200 bg-brand-50" /> Occupied <b className="text-ink-900 tabular-nums">{taken}</b>
          </span>
          <span className="flex items-center gap-1.5 text-ink-600">
            <span className="size-3 rounded border border-dashed border-ink-300 bg-white" /> Free <b className="text-ink-900 tabular-nums">{beds - taken}</b>
          </span>
          {unassigned.length > 0 && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              {unassigned.length} student{unassigned.length === 1 ? "" : "s"} waiting for a bed
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} className="size-4 accent-brand-600" />
          Only rooms with free beds
        </label>
      </div>

      {floors.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-ink-500">{rooms.length ? "Every room is full." : "No rooms yet. Add one with the form."}</p>
      )}

      <div className="space-y-6 p-5">
        {floors.map(([floor, list]) => (
          <section key={floor}>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-500 uppercase">{floor}</h3>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {list.map((room) => {
                const free = room.capacity - room.occupants.length;
                return (
                  <div key={room.id} className="rounded-xl border border-ink-200 bg-white p-3">
                    <div className="mb-2.5 flex items-baseline justify-between gap-2">
                      <p className="font-display font-semibold text-ink-900">
                        Room {room.number} <span className="text-xs font-normal text-ink-500 capitalize">· {room.roomType}</span>
                      </p>
                      <p className="text-xs text-ink-500 tabular-nums">{money(room.monthlyRent)}/bed</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {room.occupants.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setTarget({ kind: "occupied", room, student: s })}
                          className="flex min-w-0 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5 text-left hover:border-brand-400"
                        >
                          <Avatar name={s.name} src={studentPhoto(s.id, s.photoUrl)} className="size-7 text-[10px]" />
                          <span className="truncate text-xs font-medium text-ink-800">{s.name}</span>
                        </button>
                      ))}
                      {Array.from({ length: Math.max(0, free) }, (_, i) => (
                        <button
                          key={`free-${i}`}
                          type="button"
                          disabled={!canManage}
                          onClick={() => setTarget({ kind: "free", room })}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-2 py-1.5 text-xs font-medium text-ink-500 enabled:hover:border-brand-500 enabled:hover:text-brand-700 disabled:cursor-default"
                        >
                          {canManage ? <Plus className="size-3.5" /> : <BedDouble className="size-3.5" />} Free bed
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Modal open={target !== null} onClose={() => setTarget(null)} title={titleFor(target)}>
        {target?.kind === "free" && (
          <StudentPicker
            students={unassigned}
            branchId={branchId}
            pending={pending}
            onPick={(s) => run(s.id, target.room.id, `${s.name} moved into Room ${target.room.number}`)}
          />
        )}
        {target?.kind === "occupied" && (
          <div className="space-y-2">
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={target.student.name} src={studentPhoto(target.student.id, target.student.photoUrl)} className="size-12 text-sm" />
              <div>
                <p className="font-semibold text-ink-900">{target.student.name}</p>
                <p className="text-sm text-ink-500">Room {target.room.number}</p>
              </div>
            </div>
            <MenuItem href={`/app/students/${target.student.id}`} icon={<UserRound className="size-4" />}>
              Open profile
            </MenuItem>
            {canManage && (
              <>
                <MenuItem icon={<ArrowRightLeft className="size-4" />} onClick={() => setTarget({ ...target, kind: "move" })}>
                  Move to another room
                </MenuItem>
                <MenuItem
                  icon={<LogOut className="size-4" />}
                  danger
                  disabled={pending}
                  onClick={() => run(target.student.id, null, `${target.student.name} removed from Room ${target.room.number}`)}
                >
                  Remove from this room
                </MenuItem>
              </>
            )}
          </div>
        )}
        {target?.kind === "move" && (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {rooms
              .filter((r) => r.id !== target.room.id && r.occupants.length < r.capacity)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={pending}
                  onClick={() => run(target.student.id, r.id, `${target.student.name} moved to Room ${r.number}`)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50 disabled:opacity-60"
                >
                  <span>
                    <b className="text-ink-900">Room {r.number}</b> <span className="text-ink-500">{r.floor ? `· ${r.floor}` : ""}</span>
                  </span>
                  <span className="text-xs text-ink-500">
                    {r.capacity - r.occupants.length} of {r.capacity} free
                  </span>
                </button>
              ))}
            {!rooms.some((r) => r.id !== target.room.id && r.occupants.length < r.capacity) && (
              <p className="py-6 text-center text-sm text-ink-500">No other room has a free bed.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function titleFor(t: Target | null) {
  if (!t) return "";
  if (t.kind === "free") return `Assign a bed in Room ${t.room.number}`;
  if (t.kind === "move") return `Move ${t.student.name} to…`;
  return "Bed details";
}

function StudentPicker({
  students,
  branchId,
  pending,
  onPick,
}: {
  students: Occupant[];
  branchId: string;
  pending: boolean;
  onPick: (s: Occupant) => void;
}) {
  const [q, setQ] = useState("");
  const list = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  if (students.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-ink-500">
        <p>Every student in this branch already has a bed.</p>
        <Link href={`/app/students/new?branch=${branchId}`} className="mt-3 inline-block font-medium text-brand-700 hover:underline">
          Add a new student →
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-3 text-sm text-ink-500">Students in this branch who don&apos;t have a room yet:</p>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-ink-400" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-9" />
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={pending}
            onClick={() => onPick(s)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-ink-50 disabled:opacity-60"
          >
            <Avatar name={s.name} src={studentPhoto(s.id, s.photoUrl)} className="size-8 text-[11px]" />
            {s.name}
          </button>
        ))}
        {list.length === 0 && <p className="py-4 text-center text-sm text-ink-500">No match.</p>}
      </div>
    </div>
  );
}

function MenuItem({
  children,
  icon,
  href,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const cls = cx(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium disabled:opacity-60",
    danger ? "text-red-700 hover:bg-red-50" : "text-ink-700 hover:bg-ink-50",
  );
  return href ? (
    <Link href={href} className={cls}>
      {icon}
      {children}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  );
}

/** Native <dialog>: focus trapping, Esc to close and a top-layer backdrop for free. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-ink-900/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
        <h2 className="font-display font-semibold text-ink-900">{title}</h2>
        <Button type="button" variant="ghost" onClick={onClose} className="px-1.5! py-1.5!" aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-5">{open && children}</div>
    </dialog>
  );
}
