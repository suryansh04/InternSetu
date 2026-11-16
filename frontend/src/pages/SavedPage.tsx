import { InternshipListPage } from "./InternshipListPage";

export default function SavedPage() {
  return (
    <InternshipListPage
      list="saved_internships"
      emptyTitle="Nothing saved yet"
      emptyText="Save internships from your matches to build a shortlist."
    />
  );
}
