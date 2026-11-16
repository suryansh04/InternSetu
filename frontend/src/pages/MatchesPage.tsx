import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { InternshipCard } from "@/components/InternshipCard";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import {
  isProfileComplete,
  useInternshipList,
  useMatches,
  useProfile,
} from "@/hooks/useStudentData";

export default function MatchesPage() {
  const profile = useProfile();
  const matches = useMatches(profile.data);
  const saved = useInternshipList("saved_internships");
  const applied = useInternshipList("applications");

  if (profile.isPending) return <PageLoader />;
  if (profile.isError) {
    return <EmptyState title="Could not load your profile">{profile.error.message}</EmptyState>;
  }
  if (!isProfileComplete(profile.data)) return <Navigate to="/profile" replace />;
  if (matches.isPending) return <PageLoader />;
  if (matches.isError) {
    return (
      <EmptyState
        title="Could not load your matches"
        action={<Button onClick={() => matches.refetch()}>Try again</Button>}
      >
        {matches.error.message}
      </EmptyState>
    );
  }
  if (matches.data.length === 0) {
    return (
      <EmptyState
        title="No matches yet"
        action={
          <Button asChild variant="outline">
            <Link to="/profile">Edit your profile</Link>
          </Button>
        }
      >
        Try adding more skills or interests to your profile.
      </EmptyState>
    );
  }

  const onError = (err: Error) => toast.error(err.message);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Ranked for {profile.data.skills.slice(0, 4).join(", ")}
          {profile.data.skills.length > 4 ? ` and ${profile.data.skills.length - 4} more skills` : ""}.
        </p>
        <Button asChild variant="link" size="sm">
          <Link to="/profile">Edit profile</Link>
        </Button>
      </div>
      {matches.data.map(({ internship, match }) => (
        <InternshipCard
          key={internship.id}
          internship={internship}
          score={match.score}
          parts={match.parts}
          studentSkills={profile.data.skills}
          isSaved={saved.ids.has(internship.id)}
          isApplied={applied.ids.has(internship.id)}
          onToggleSaved={() => saved.toggle(internship, onError)}
          onToggleApplied={() => applied.toggle(internship, onError)}
        />
      ))}
    </div>
  );
}
