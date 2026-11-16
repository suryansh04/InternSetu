import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { PageLoader } from "@/components/PageLoader";
import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isProfileComplete, useProfile, useSaveProfile } from "@/hooks/useStudentData";
import { api } from "@/lib/api";
import type { StudentProfile } from "@/lib/types";
import { validateProfile, type ProfileErrors as Errors } from "@/lib/validation";

const MAX_RESUME_MB = 5;

const EMPTY: StudentProfile = { name: "", location: "", skills: [], interests: [], duration_months: 3 };

export default function ProfilePage() {
  const navigate = useNavigate();
  const saved = useProfile();
  const save = useSaveProfile();
  const [form, setForm] = useState<StudentProfile>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  // Start from the saved profile, once it has loaded.
  useEffect(() => {
    if (saved.data) {
      setForm({ ...saved.data, duration_months: saved.data.duration_months || EMPTY.duration_months });
    }
  }, [saved.data]);

  const update = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onResume = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (file.type !== "application/pdf") return void toast.error("Please choose a PDF file.");
    if (file.size > MAX_RESUME_MB * 1024 * 1024) {
      return void toast.error(`Please choose a PDF under ${MAX_RESUME_MB} MB.`);
    }

    setResumeName(file.name);
    setParsing(true);
    try {
      const { profile } = await api.parseResume(file);
      // Only fill in what the resume told us; keep anything already typed.
      setForm((f) => ({
        name: profile.name || f.name,
        location: profile.location || f.location,
        skills: profile.skills?.length ? profile.skills : f.skills,
        interests: profile.interests?.length ? profile.interests : f.interests,
        duration_months: profile.duration_months || f.duration_months,
      }));
      setErrors({});
      toast.success("Resume read. Check the details below, then save.");
    } catch (err) {
      setResumeName(null);
      toast.error((err as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    save.mutate(
      { ...form, name: form.name.trim(), location: form.location.trim() },
      {
        onSuccess: () => navigate("/app"),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (saved.isPending) return <PageLoader />;
  const firstTime = !isProfileComplete(saved.data);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Logo to={firstTime ? "/" : "/app"} />
          {!firstTime && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/app">Back to matches</Link>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl">{firstTime ? "Set up your profile" : "Your profile"}</h1>
            </CardTitle>
            <CardDescription>
              Upload your resume to fill this in automatically, or type it yourself. Your matches are
              based on these details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate className="space-y-6">
              <label
                htmlFor="resume"
                className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary/50 has-[:focus-visible]:border-primary"
              >
                {parsing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : resumeName ? (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {parsing ? "Reading your resume…" : resumeName ?? "Upload your resume"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    PDF, up to {MAX_RESUME_MB} MB. AI fills in the fields below.
                  </span>
                </span>
                <input
                  id="resume"
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={onResume}
                  disabled={parsing}
                />
              </label>

              <Field id="name" label="Full name" error={errors.name}>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoComplete="name"
                  aria-invalid={!!errors.name || undefined}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
              </Field>

              <Field id="location" label="City" hint="Where you want to work, e.g. Pune, India." error={errors.location}>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  autoComplete="address-level2"
                  aria-invalid={!!errors.location || undefined}
                  aria-describedby="location-hint"
                />
              </Field>

              <Field
                id="skills"
                label="Skills"
                hint="Languages, frameworks and tools. Press Enter after each."
                error={errors.skills}
              >
                <TagInput
                  id="skills"
                  value={form.skills}
                  onChange={(v) => update("skills", v)}
                  placeholder="e.g. React"
                  invalid={!!errors.skills}
                  describedBy="skills-hint"
                />
              </Field>

              <Field id="interests" label="Interests" hint="Fields you would like to work in. Optional.">
                <TagInput
                  id="interests"
                  value={form.interests}
                  onChange={(v) => update("interests", v)}
                  placeholder="e.g. Machine learning"
                  describedBy="interests-hint"
                />
              </Field>

              <Field
                id="duration_months"
                label="Months available"
                hint="How long you can intern for."
                error={errors.duration_months}
              >
                <Input
                  id="duration_months"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={24}
                  className="w-32"
                  value={form.duration_months || ""}
                  onChange={(e) => update("duration_months", Number(e.target.value))}
                  aria-invalid={!!errors.duration_months || undefined}
                  aria-describedby="duration_months-hint"
                />
              </Field>

              <Button type="submit" className="w-full" disabled={save.isPending || parsing}>
                {save.isPending && <Loader2 className="animate-spin" />}
                {firstTime ? "Save and see my matches" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
