import { ActionType, createAction, createReducer } from "typesafe-actions";

import { createInitialState, initialState } from "@/store/reducers/dogs/swipe";

export enum LogoutAction {
  Logout = "LOGOUT",
}

const logout = createAction(LogoutAction.Logout)();

export const Actions = { logout };

const logoutHandler = (state = initialState) => createInitialState(state.config.sessionId + 1);

export default createReducer<typeof initialState, ActionType<typeof Actions>>(
  initialState,
).handleAction(Actions.logout, logoutHandler);
