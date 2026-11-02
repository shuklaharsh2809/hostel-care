/** URL for a student's photo, versioned by its storage key so new uploads bust the cache. */
export function studentPhoto(studentId: string, photoKey: string | null | undefined) {
  return photoKey ? `/media/students/${studentId}/photo?v=${encodeURIComponent(photoKey)}` : null;
}
