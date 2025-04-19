import { produce } from "immer";
import { ActionType, createAction, createReducer } from "typesafe-actions";

import { initialState } from "@/store/reducers/dogs/swipe";

export enum LogoutAction {
  Logout = "LOGOUT"
}

const logout = createAction(LogoutAction.Logout)();

export const Actions = { logout };

const logoutHandler = (state = initialState) =>
  produce(state, (draft) => {
    draft = initialState;

    return draft;
  });

export default createReducer<typeof initialState, ActionType<typeof Actions>>(
  initialState
).handleAction(Actions.logout, logoutHandler);
