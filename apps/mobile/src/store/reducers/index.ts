import { combineReducers } from "redux";

import * as dogs from "./dogs";
import * as swipe from "./dogs/swipe";

export const Types = {
  ...dogs.Types
};

export const Actions = {
  dogs: dogs.Actions
};

const rootReducer = combineReducers({
  dogs: dogs.default
});

export interface RootReducer {
  dogs: typeof swipe.initialState;
}

export default rootReducer;
