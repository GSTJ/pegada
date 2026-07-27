import type { AnyAction } from "redux";
import type { Reducer } from "typesafe-actions";

import reduceReducers from "reduce-reducers";

import listReducer, { Actions as listActions, ListAction } from "./list";
import logoutReducer, {
  Actions as logoutActions,
  LogoutAction,
} from "./logout";
import swipeReducer, {
  Actions as swipeActions,
  initialState,
  SwipeAction,
} from "./swipe";

export const Types = {
  ...ListAction,
  ...SwipeAction,
  ...LogoutAction,
};

export const Actions = {
  swipe: swipeActions,
  list: listActions,
  logout: logoutActions,
};

export default reduceReducers(
  initialState,
  swipeReducer as Reducer<typeof initialState, AnyAction>,
  listReducer as Reducer<typeof initialState, AnyAction>,
  logoutReducer as Reducer<typeof initialState, AnyAction>,
);
