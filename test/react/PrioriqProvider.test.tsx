/** @jest-environment jsdom */

import React from "react";
import { renderHook } from "@testing-library/react";
import { PrioriqProvider, usePrioriq } from "../../src/react/PrioriqProvider";
import { Prioriq } from "../../src/core/Prioriq";

describe("PrioriqProvider", () => {
  test("provides an instance of Prioriq", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PrioriqProvider>{children}</PrioriqProvider>
    );
    const { result } = renderHook(() => usePrioriq(), { wrapper });
    expect(result.current).toBeInstanceOf(Prioriq);
  });

  test("throws if used outside provider", () => {
    const { result } = renderHook(() => {
      try {
        usePrioriq();
      } catch (e) {
        return e;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toMatch(/must be used inside/);
  });

  test("uses supplied instance if provided", () => {
    const custom = new Prioriq();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PrioriqProvider value={custom}>{children}</PrioriqProvider>
    );
    const { result } = renderHook(() => usePrioriq(), { wrapper });
    expect(result.current).toBe(custom);
  });
});
