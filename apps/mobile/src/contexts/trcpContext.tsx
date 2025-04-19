import { api } from "./TRPCProvider";

let trcpContext = undefined as unknown as ReturnType<typeof api.useUtils>;

export const setTrcpContext = (context: ReturnType<typeof api.useUtils>) => {
  trcpContext = context;
};

export const getTrcpContext = () => trcpContext;
