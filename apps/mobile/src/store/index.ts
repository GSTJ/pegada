import { configureStore, Tuple } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";

import reducer from "./reducers";
import sagas from "./sagas";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer,
  middleware: () => new Tuple(sagaMiddleware)
});

sagaMiddleware.run(sagas);
