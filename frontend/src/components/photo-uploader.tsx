"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, Button } from "./ui";
import type { FormState } from "./action-form";

/** Shrinks an image in the browser to a ~512px JPEG so uploads stay small and fast. */
async function resize(file: File, max = 512): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file; // e.g. a format the browser can't decode; the API will validate it
  }
}

export function PhotoUploader({
  name,
  src,
  canEdit,
  upload,
  remove,
}: {
  name: string;
  src: string | null;
  canEdit: boolean;
  upload: (fd: FormData) => Promise<FormState>;
  remove: () => Promise<FormState>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function onPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image file");
    start(async () => {
      const blob = await resize(file);
      if (blob.size > 2 * 1024 * 1024) return void toast.error("Photo is larger than 2 MB");
      const fd = new FormData();
      fd.set("photo", blob, "photo.jpg");
      const res = await upload(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Photo updated");
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} src={src} className="size-20 text-xl" />
        {pending && <div className="absolute inset-0 animate-pulse rounded-full bg-white/60" />}
      </div>
      {canEdit && (
        <div className="flex flex-col items-start gap-1">
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
          <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()} className="px-2.5 py-1.5 text-xs">
            <Camera className="size-3.5" /> {src ? "Change photo" : "Add photo"}
          </Button>
          {src && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="px-2.5 py-1 text-xs"
              onClick={() =>
                start(async () => {
                  const res = await remove();
                  if (res?.error) toast.error(res.error);
                  else toast.success("Photo removed");
                })
              }
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
