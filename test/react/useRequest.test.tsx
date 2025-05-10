/** @jest-environment jsdom */

import React from "react";
import { act, renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRequest } from "../../src/react/useRequest";
import { PrioriqProvider } from "../../src/react/PrioriqProvider";
import { Prioriq } from "../../src/core/Prioriq";

describe("useRequest", () => {
  const queryClient = new QueryClient();
  const prioriq = new Prioriq();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PrioriqProvider value={prioriq}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrioriqProvider>
  );

  test("calls fetchFn and returns data", async () => {
    const fetchFn = jest.fn().mockResolvedValue("data");
    let result: any;

    await act(async () => {
      result = renderHook(
        () =>
          useRequest({
            id: "test",
            queryKey: ["test"],
            fetchFn,
          }),
        { wrapper }
      );
    });

    await waitFor(() => expect(result.result.current.isSuccess).toBe(true));
    expect(fetchFn).toHaveBeenCalled();
    expect(result.result.current.data).toBe("data");
  });

  test("dedupeKey avoids duplicate fetch", async () => {
    const fetchFn = jest.fn().mockResolvedValue("deduped");

    await act(async () => {
      renderHook(
        () =>
          useRequest({
            id: "task1",
            queryKey: ["same"],
            fetchFn,
            dedupeKey: "same",
          }),
        { wrapper }
      );

      renderHook(
        () =>
          useRequest({
            id: "task2",
            queryKey: ["same"],
            fetchFn,
            dedupeKey: "same",
          }),
        { wrapper }
      );
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
