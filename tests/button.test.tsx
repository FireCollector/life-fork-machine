import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders an accessible native button", () => {
    render(<Button>开始推演</Button>);

    expect(
      screen.getByRole("button", { name: "开始推演" })
    ).toBeInTheDocument();
  });
});
