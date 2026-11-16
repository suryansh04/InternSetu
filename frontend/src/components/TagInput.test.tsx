import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TagInput } from "./TagInput";

function Harness({ initial = [] as string[], max }: { initial?: string[]; max?: number }) {
  const [tags, setTags] = useState(initial);
  return (
    <TagInput id="skills" value={tags} onChange={setTags} placeholder="Add a skill" max={max} />
  );
}

const tags = () => screen.queryAllByRole("listitem").map((li) => li.textContent);

describe("TagInput", () => {
  it("adds a tag on Enter or comma, ignoring case duplicates", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("textbox");
    await user.type(input, "React{Enter}SQL,react{Enter}");
    expect(tags()).toEqual(["React", "SQL"]);
    expect(input).toHaveValue("");
  });

  it("removes a tag with its button or with Backspace on an empty input", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["React", "SQL", "Go"]} />);
    await user.click(screen.getByRole("button", { name: "Remove SQL" }));
    expect(tags()).toEqual(["React", "Go"]);
    await user.type(screen.getByRole("textbox"), "{Backspace}");
    expect(tags()).toEqual(["React"]);
  });

  it("stops accepting tags at the maximum", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["React"]} max={2} />);
    await user.type(screen.getByRole("textbox"), "SQL{Enter}");
    expect(tags()).toEqual(["React", "SQL"]);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
