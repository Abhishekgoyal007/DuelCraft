// backend/src/profiles.ts
export type Avatar = {
  body: string;   // e.g. "square", "round"
  hair: string;   // e.g. "spiky", "bald"
  face: string;   // e.g. "smile", "angry"
  color?: string; // e.g. "#66c2ff"
  skin?: string;  // optional skin name / premium
};

const store: Record<string, Avatar> = {}; // keyed by address (lowercase)

export function saveProfile(address: string, avatar: Avatar) {
  if (!address) return false;
  store[address.toLowerCase()] = avatar;
  return true;
}

export function getProfile(address: string) {
  if (!address) return null;
  return store[address.toLowerCase()] || null;
}
