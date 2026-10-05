export class PushRegistrationState {
  #enabled = true;
  #generation = 0;

  get enabled() {
    return this.#enabled;
  }

  begin() {
    this.#enabled = true;
    const generation = ++this.#generation;

    return {
      isCurrent: () => this.#enabled && generation === this.#generation,
    };
  }

  invalidate() {
    this.#enabled = false;
    this.#generation += 1;
  }
}

export const pushRegistrationState = new PushRegistrationState();
