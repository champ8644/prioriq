/** @jest-environment jsdom */

import React from "react";
import { act, renderHook } from "@testing-library/react";
import { usePrioriqInspector } from "../../src/react/usePrioriqInspector";
import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("usePrioriqInspector", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("returns snapshot after polling", async () => {
    scheduler.request({
      id: "snap-hook",
      group: "g1",
      debounceMs: 100,
      task: async () => {},
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => <></>;

    const { result } = renderHook(() => usePrioriqInspector(scheduler, "g1"), {
      wrapper,
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current).toBeDefined();
    expect(result.current).toEqual(scheduler.snapshot("g1"));
  });

  test("returns full snapshot when no group specified", async () => {
    scheduler.request({
      id: "snap2",
      group: "default",
      delay: 200,
      task: async () => {},
    });

    const { result } = renderHook(() => usePrioriqInspector(scheduler));

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current).toBeDefined();
    expect(result.current).toEqual(scheduler.snapshot());
  });
});
