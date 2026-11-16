import { InternshipListPage } from "./InternshipListPage";

export default function ApplicationsPage() {
  return (
    <InternshipListPage
      list="applications"
      emptyTitle="No applications tracked yet"
      emptyText="Mark internships as applied to keep track of where you have applied."
    />
  );
}
