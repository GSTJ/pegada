/**
 * The button is done when either source says so. The local flag answers
 * immediately and keeps working offline, and the server value is what brings
 * the state back after a reinstall or after local storage was cleared.
 */
export const isNewDogsAlertRequested = ({
  storedLocally,
  requestedAt,
}: {
  storedLocally: boolean;
  requestedAt?: Date | null;
}) => storedLocally || Boolean(requestedAt);
