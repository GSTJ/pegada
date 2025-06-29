import { combineReducers } from "redux";

import type { initialState as SwipeInitialState } from "./dogs/swipe";
import dogsReducer, {
  Actions as DogsActions,
  Types as DogsTypes
} from "./dogs";

export const Types = {
  ...DogsTypes
};

export const Actions = {
  dogs: DogsActions
};

const rootReducer = combineReducers({
  dogs: dogsReducer
});

export interface RootReducer {
  dogs: typeof SwipeInitialState;
}

export default rootReducer;
