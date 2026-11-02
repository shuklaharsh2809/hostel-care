import type { Metadata } from "next";
import { createStudent } from "../actions";
import { StudentForm } from "../student-form";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { StudentFormOptions } from "@/lib/types";

export const metadata: Metadata = { title: "Add student" };

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const { branch } = await searchParams;
  const opts = await api<StudentFormOptions>("/students/form-options");
  return (
    <>
      <PageHeader back={{ href: "/app/students", label: "Students" }} title="Add student" description="Fill in whatever details the student has shared. Only the name and branch are required." />
      <StudentForm action={createStudent} {...opts} defaultBranchId={branch} submitLabel="Add student" />
    </>
  );
}
