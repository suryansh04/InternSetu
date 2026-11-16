import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
  /** Most tags allowed; the input is disabled once reached. */
  max?: number;
  /** Longest single tag. */
  maxLength?: number;
}

/** A list of short tags: type and press Enter (or comma) to add, click × to remove. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  describedBy,
  max = Infinity,
  maxLength = 60,
}: TagInputProps) {
  const full = value.length >= max;
  const [draft, setDraft] = useState("");

  const add = () => {
    const tag = draft.trim().replace(/,$/, "");
    if (tag && !full && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-sm text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="rounded-full p-0.5 hover:bg-secondary-foreground/15"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={full ? `Up to ${max}` : placeholder}
          maxLength={maxLength}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={add}
          disabled={full || !draft.trim()}
          aria-label="Add"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
