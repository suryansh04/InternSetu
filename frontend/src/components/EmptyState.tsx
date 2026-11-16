import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {action}
    </div>
  );
}
