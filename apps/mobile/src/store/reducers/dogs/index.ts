/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Reducer } from "typesafe-actions";
import reduceReducers from "reduce-reducers";

import listReducer, { ListAction, Actions as ListActions } from "./list";
import logoutReducer, {
  LogoutAction,
  Actions as LogoutActions
} from "./logout";
import swipeReducer, {
  initialState,
  SwipeAction,
  Actions as SwipeActions
} from "./swipe";

export const Types = {
  ...ListAction,
  ...SwipeAction,
  ...LogoutAction
};

export const Actions = {
  swipe: SwipeActions,
  list: ListActions,
  logout: LogoutActions
};

export default reduceReducers(
  initialState,
  swipeReducer as Reducer<typeof initialState, any>,
  listReducer as Reducer<typeof initialState, any>,
  logoutReducer as Reducer<typeof initialState, any>
);
