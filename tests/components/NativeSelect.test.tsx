// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NativeSelect from "@/components/ui/native-select";

describe("NativeSelect", () => {
  it("renders options", () => {
    render(
      <NativeSelect value="a" onChange={() => {}}>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </NativeSelect>
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("fires onChange with new value", () => {
    const handleChange = vi.fn();
    render(
      <NativeSelect value="a" onChange={handleChange}>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </NativeSelect>
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(handleChange).toHaveBeenCalledOnce();
  });

  it("chevron icon is aria-hidden", () => {
    const { container } = render(
      <NativeSelect value="a" onChange={() => {}}>
        <option value="a">Alpha</option>
      </NativeSelect>
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("passes disabled prop to underlying select", () => {
    render(
      <NativeSelect value="a" onChange={() => {}} disabled>
        <option value="a">Alpha</option>
      </NativeSelect>
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
