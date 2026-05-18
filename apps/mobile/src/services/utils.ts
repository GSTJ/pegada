import { DependencyList, EffectCallback, useEffect, useRef } from "react";

export const useDidMountEffect = (func: EffectCallback, deps: DependencyList) => {
  const didMount = useRef(false);

  useEffect(() => {
    if (didMount.current) func();
    else didMount.current = true;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- forwarding caller-provided deps is the entire point of this hook
  }, deps);
};
