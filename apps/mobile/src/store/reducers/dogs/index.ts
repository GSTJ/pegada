import reduceReducers from "reduce-reducers";
import { Reducer } from "typesafe-actions";

import * as list from "./list";
import * as logout from "./logout";
import * as swipe from "./swipe";
import { initialState } from "./swipe";

export const Types = {
  ...list.ListAction,
  ...swipe.SwipeAction,
  ...logout.LogoutAction
};

export const Actions = {
  swipe: swipe.Actions,
  list: list.Actions,
  logout: logout.Actions
};

export default reduceReducers(
  initialState,
  swipe.default as Reducer<typeof swipe.initialState, any>,
  list.default as Reducer<typeof swipe.initialState, any>,
  logout.default as Reducer<typeof swipe.initialState, any>
);
