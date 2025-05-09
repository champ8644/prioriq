import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type { BaseTaskOptions } from "../core/types";

export interface ReactTaskOptions<Meta = Record<string, any>>
  extends BaseTaskOptions<Meta> {
  group?: string;
  priority?: number | "HOT" | "WARM" | "COLD";
  delay?: number;
  debounceMs?: number;
  idle?: boolean;
}

export interface UseRequestOptions<T, Meta = Record<string, any>>
  extends Omit<
      UseQueryOptions<T, Error, T, readonly unknown[]>,
      "queryKey" | "queryFn" | "meta"
    >,
    ReactTaskOptions<Meta> {
  queryKey: QueryKey;
  fetchFn: () => Promise<T>;
  meta?: Meta;
}
