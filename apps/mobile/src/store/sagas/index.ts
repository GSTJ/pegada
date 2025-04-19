import dogs from "@/store/sagas/dogs";

export default function* rootSaga() {
  yield dogs;
}
