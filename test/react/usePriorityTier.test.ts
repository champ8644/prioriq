/** @jest-environment jsdom */

import { usePriorityTier } from "../../src/react/internal/usePriorityTier";
import { renderHook } from "@testing-library/react";

describe("usePriorityTier", () => {
  test("maps HOT to 1", () => {
    const { result } = renderHook(() => usePriorityTier("HOT"));
    expect(result.current).toBe(1);
  });

  test("maps WARM to 5", () => {
    const { result } = renderHook(() => usePriorityTier("WARM"));
    expect(result.current).toBe(5);
  });

  test("maps COLD to 10", () => {
    const { result } = renderHook(() => usePriorityTier("COLD"));
    expect(result.current).toBe(10);
  });
});
