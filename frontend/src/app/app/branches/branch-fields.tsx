import type { Branch } from "@/lib/types";
import { Field, Input } from "@/components/ui";

export function BranchFields({ branch }: { branch?: Branch }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Branch name" className="sm:col-span-2">
        <Input name="name" required defaultValue={branch?.name} placeholder="e.g. Sunrise Boys – Kothrud" />
      </Field>
      <Field label="Short code" hint="Used on reports, e.g. KTH">
        <Input name="code" required maxLength={8} defaultValue={branch?.code} className="uppercase" />
      </Field>
      <Field label="City">
        <Input name="city" defaultValue={branch?.city ?? ""} />
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <Input name="address" defaultValue={branch?.address ?? ""} />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={branch?.phone ?? ""} />
      </Field>
      <Field label="Warden / manager name">
        <Input name="wardenName" defaultValue={branch?.wardenName ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
        <input type="checkbox" name="hasMess" defaultChecked={branch?.hasMess ?? true} className="size-4 accent-brand-600" />
        This branch runs a mess (food service)
      </label>
    </div>
  );
}
