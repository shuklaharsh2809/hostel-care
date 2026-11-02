import { updateStudent } from "../../actions";
import { StudentForm } from "../../student-form";
import { PageHeader } from "@/components/ui";
import { api, apiOrNotFound } from "@/lib/api";
import type { StudentDetail, StudentFormOptions } from "@/lib/types";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ student }, opts] = await Promise.all([
    apiOrNotFound<StudentDetail>(`/students/${id}`),
    api<StudentFormOptions>("/students/form-options"),
  ]);
  return (
    <>
      <PageHeader back={{ href: `/app/students/${id}`, label: student.fullName }} title="Edit student" />
      <StudentForm action={updateStudent.bind(null, id)} {...opts} student={student} submitLabel="Save changes" />
    </>
  );
}
