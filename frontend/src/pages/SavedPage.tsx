import { InternshipList } from "@/components/InternshipList";

export default function SavedPage() {
  return (
    <InternshipList
      list="saved_internships"
      emptyTitle="Nothing saved yet"
      emptyText="Save internships from your matches to build a shortlist."
    />
  );
}
