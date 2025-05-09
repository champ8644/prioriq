import {
  createContext,
  useContext,
  useRef,
  type PropsWithChildren,
} from "react";
import { Prioriq } from "../core/Prioriq";

type OptionalProps = {
  /** Supply your own instance if you want; otherwise one is auto-created */
  value?: Prioriq;
};

const PrioriqContext = createContext<Prioriq | undefined>(undefined);

/**
 * Provider that guarantees exactly one Prioriq instance per React tree.
 * If you omit `value`, the provider lazily constructs its own scheduler.
 */
export function PrioriqProvider({
  value,
  children,
}: PropsWithChildren<OptionalProps>) {
  // Lazily create at most one instance for this provider
  const instanceRef = useRef<Prioriq | null>(null);
  if (!instanceRef.current) {
    instanceRef.current = value ?? new Prioriq();
  }

  return (
    <PrioriqContext.Provider value={instanceRef.current}>
      {children}
    </PrioriqContext.Provider>
  );
}

/** Consumer hook — throws if the provider is missing. */
export function usePrioriq(): Prioriq {
  const ctx = useContext(PrioriqContext);
  if (!ctx) {
    throw new Error("usePrioriq must be used inside <PrioriqProvider>");
  }
  return ctx;
}
