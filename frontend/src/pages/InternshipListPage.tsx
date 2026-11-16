import { Link } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { InternshipCard } from "@/components/InternshipCard";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { useInternshipList, useProfile } from "@/hooks/useStudentData";

/** Saved and Applied are the same page over different tables. */
export function InternshipListPage({
  list,
  emptyTitle,
  emptyText,
}: {
  list: "saved_internships" | "applications";
  emptyTitle: string;
  emptyText: string;
}) {
  const profile = useProfile();
  const saved = useInternshipList("saved_internships");
  const applied = useInternshipList("applications");
  const current = list === "saved_internships" ? saved : applied;

  if (current.isPending) return <PageLoader />;
  if (current.isError) {
    return <EmptyState title="Could not load this list">{current.error.message}</EmptyState>;
  }
  if (current.data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        action={
          <Button asChild>
            <Link to="/app">See your matches</Link>
          </Button>
        }
      >
        {emptyText}
      </EmptyState>
    );
  }

  const onError = (err: Error) => toast.error(err.message);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {current.data.map((internship) => (
        <InternshipCard
          key={internship.id}
          internship={internship}
          studentSkills={profile.data?.skills}
          isSaved={saved.ids.has(internship.id)}
          isApplied={applied.ids.has(internship.id)}
          onToggleSaved={() => saved.toggle(internship, onError)}
          onToggleApplied={() => applied.toggle(internship, onError)}
        />
      ))}
    </div>
  );
}
