import { randomUUID } from "crypto";

// Compared against
export const referenceUser = {
  latitude: 37.7748,
  longitude: -122.4194
};

export const usersWithLocation = [
  {
    id: randomUUID(),
    latitude: 34.7749,
    longitude: -121.4194
  },
  {
    id: randomUUID(),
    latitude: 40.7749,
    longitude: -100.4194
  },
  {
    id: randomUUID(),
    latitude: 11.7749,
    longitude: -98.4194
  },
  {
    id: randomUUID(),
    latitude: 37.7749,
    longitude: -122.4194
  },
  {
    id: randomUUID(),
    latitude: 35.7749,
    longitude: -80.4194
  },
  {
    id: randomUUID(),
    latitude: 11,
    longitude: 10
  }
];
