export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

export const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a, s) => v3(a.x * s, a.y * s, a.z * s);
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

export const cross = (a, b) => v3(
  a.y * b.z - a.z * b.y,
  a.z * b.x - a.x * b.z,
  a.x * b.y - a.y * b.x
);

export const length = (a) => Math.sqrt(dot(a, a));

export const normalize = (a) => {
  const len = length(a);
  return len < 1e-9 ? v3(0, 0, 0) : scale(a, 1 / len);
};
