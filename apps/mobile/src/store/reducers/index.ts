import type { initialState as swipeInitialState } from "./dogs/swipe";

import { combineReducers } from "redux";

import dogsReducer, {
  Actions as dogsActions,
  Types as dogsTypes,
} from "./dogs";

export const Types = {
  ...dogsTypes,
};

export const Actions = {
  dogs: dogsActions,
};

const rootReducer = combineReducers({
  dogs: dogsReducer,
});

export type RootReducer = {
  dogs: typeof swipeInitialState;
};

export default rootReducer;
