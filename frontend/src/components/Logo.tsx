import { Link } from "react-router-dom";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold text-foreground">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <span className="text-xl">InternSetu</span>
    </Link>
  );
}
