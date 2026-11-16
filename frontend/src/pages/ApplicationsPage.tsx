import { InternshipList } from "@/components/InternshipList";

export default function ApplicationsPage() {
  return (
    <InternshipList
      list="applications"
      emptyTitle="No applications tracked yet"
      emptyText="Mark internships as applied to keep track of where you have applied."
    />
  );
}
