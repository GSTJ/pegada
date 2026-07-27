import { all } from "redux-saga/effects";

import listSaga from "./list";
import swipeSaga from "./swipe";

export default all([listSaga, swipeSaga]);
