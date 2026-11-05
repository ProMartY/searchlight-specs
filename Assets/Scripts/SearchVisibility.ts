export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface Blocker {
  min: Point3;
  max: Point3;
}

const axes = ["x", "y", "z"] as const;

function intersectsSegment(eye: Point3, direction: Point3, blocker: Blocker): boolean {
  let entry = 0;
  let exit = 1;

  for (const axis of axes) {
    const origin = eye[axis];
    const delta = direction[axis];
    const min = blocker.min[axis];
    const max = blocker.max[axis];

    if (delta === 0) {
      if (origin < min || origin > max) {
        return false;
      }
      continue;
    }

    const first = (min - origin) / delta;
    const second = (max - origin) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) {
      return false;
    }
  }

  // A contact only at the eye or target does not block the view.
  return exit > 0 && entry < 1;
}

export function blockedBetween(eye: Point3, point: Point3, blockers: Blocker[]): boolean {
  const direction = {
    x: point.x - eye.x,
    y: point.y - eye.y,
    z: point.z - eye.z,
  };
  if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
    return false;
  }

  return blockers.some((blocker) => intersectsSegment(eye, direction, blocker));
}

export function sampleState(
  points: Point3[],
  eye: Point3,
  blockers: Blocker[],
  inView: (point: Point3) => boolean,
): "offscreen" | "blocked" | "partial" | "clear" {
  let inViewCount = 0;
  let visibleCount = 0;

  for (const point of points) {
    if (inView(point)) {
      inViewCount++;
      if (!blockedBetween(eye, point, blockers)) {
        visibleCount++;
      }
    }
  }

  if (inViewCount === 0) {
    return "offscreen";
  }
  if (visibleCount === 0) {
    return "blocked";
  }
  return visibleCount === points.length ? "clear" : "partial";
}
