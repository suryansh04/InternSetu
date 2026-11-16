import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import { MIN_PASSWORD_LENGTH } from "@/lib/limits";

/** Opened from the reset email: the link signs the user in, then they pick a new password. */
export default function ResetPasswordPage() {
  const { currentUser, updatePassword } = useAuthContext();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentUser) {
    return (
      <AuthCard
        title="This link has expired"
        subtitle="Reset links work once and expire after an hour."
      >
        <Button asChild className="w-full">
          <Link to="/forgot-password">Send a new link</Link>
        </Button>
      </AuthCard>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    setError(null);
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success("Password updated.");
      navigate("/app", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Choose a new password" error={error}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
