import type { Blocker, Point3 } from "./SearchVisibility";

type Color = [number, number, number];
type Face = [number, number, number, number, number, number, number];

// In shelf coordinates, +Z points toward the person searching.
const faces: Face[] = [
  [1, 0, 0, 1, 5, 6, 2], [-1, 0, 0, 4, 0, 3, 7],
  [0, 1, 0, 3, 2, 6, 7], [0, -1, 0, 4, 5, 1, 0],
  [0, 0, 1, 0, 1, 2, 3], [0, 0, -1, 5, 4, 7, 6],
];

class Mesh {
  private readonly positions: number[] = [];
  private readonly triangles: number[] = [];

  box(x: number, y: number, z: number, width: number, height: number, depth: number, color: Color): void {
    const l = x - width / 2, r = x + width / 2;
    const b = y - height / 2, t = y + height / 2;
    const f = z + depth / 2, k = z - depth / 2;
    const corners = [
      [l, b, f], [r, b, f], [r, t, f], [l, t, f],
      [l, b, k], [r, b, k], [r, t, k], [l, t, k],
    ];
    faces.forEach(([nx, ny, nz, ...ids]) => {
      const start = this.positions.length / 10;
      // Subtle baked shading keeps the prop legible against a bright Preview room.
      const shade = ny === 1 ? 1 : ny === -1 ? 0.58 : nx ? 0.74 : 0.85;
      ids.forEach(id => {
        this.positions.push(...corners[id], nx, ny, nz, color[0] * shade, color[1] * shade, color[2] * shade, 1);
      });
      this.triangles.push(start, start + 1, start + 2, start, start + 2, start + 3);
    });
  }

  ring(x: number, y: number, z: number, outer: number, inner: number, color: Color): void {
    for (let i = 0; i < 28; i++) {
      const a = i * Math.PI / 14;
      const b = (i + 1) * Math.PI / 14;
      const start = this.positions.length / 10;
      for (const [radius, angle] of [[outer, a], [inner, a], [inner, b], [outer, b]]) {
        this.positions.push(x + radius * Math.cos(angle), y, z + radius * Math.sin(angle), 0, 1, 0, ...color, 1);
      }
      this.triangles.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }

  make(object: SceneObject, material: Material): void {
    const builder = new MeshBuilder([
      { name: "position", components: 3 },
      { name: "normal", components: 3 },
      { name: "color", components: 4 },
    ]);
    builder.topology = MeshTopology.Triangles;
    builder.indexType = MeshIndexType.UInt16;
    builder.appendVerticesInterleaved(this.positions);
    builder.appendIndices(this.triangles);
    builder.updateMesh();
    const visual = object.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
    visual.mesh = builder.getMesh();
    visual.mainMaterial = material;
  }
}

function child(parent: SceneObject, name: string, position: vec3): SceneObject {
  const object = global.scene.createSceneObject(name);
  object.setParent(parent);
  object.getTransform().setLocalPosition(position);
  return object;
}

const oak: Color = [0.63, 0.44, 0.29];
const darkOak: Color = [0.36, 0.25, 0.18];
const cardboard: Color = [0.77, 0.49, 0.29];
const tape: Color = [0.91, 0.70, 0.43];
const gold: Color = [0.99, 0.79, 0.28];
const teal: Color = [0.19, 0.48, 0.49];
const ink: Color = [0.09, 0.18, 0.22];
const paper: Color = [0.80, 0.73, 0.59];

export const BOX_SIZE = { x: 22, y: 18, z: 20 };
export const BOX_HOME = { x: 0, y: 9, z: -13 };
export const BOX_ASIDE_X = 26;
export const ZONES = [
  { name: "Left", x: -25, z: -23 },
  { name: "Behind box", x: -5, z: -48 },
  { name: "Right", x: 26, z: -30 },
];
export type Cue = "idle" | "blocked" | "new" | "seen";

export class SearchShelf {
  readonly box: SceneObject;
  private readonly badges: Record<Cue, SceneObject>[];

  constructor(readonly root: SceneObject, material: Material) {
    const shelf = new Mesh();
    shelf.box(0, -1.8, -28, 84, 3.6, 56, oak);
    shelf.box(0, -3.1, -0.4, 84, 1, 1.5, darkOak);
    shelf.box(0, 13, -55, 84, 29.2, 1.8, darkOak);
    for (const x of [-41, 41]) {
      shelf.box(x, 13, -28, 2, 29.2, 56, oak);
      shelf.box(x, -29, -10, 3, 52, 3, darkOak);
      shelf.box(x, -29, -48, 3, 52, 3, darkOak);
    }
    shelf.box(0, -50, -28, 83, 2.4, 56, darkOak);
    shelf.make(child(root, "Oak shelf", vec3.zero()), material);

    const props = new Mesh();
    props.box(-31, 1.2, -37, 12, 2.4, 16, ink);
    props.box(-31, 2.5, -37, 11, 0.3, 15, paper);
    props.box(-32, 3.1, -39, 11, 1, 13, teal);
    props.box(29, 1, -42, 14, 2, 11, ink);
    props.box(29, 2.5, -42, 13, 1, 10, teal);
    props.make(child(root, "Household props", vec3.zero()), material);

    this.box = child(root, "Movable cardboard box", new vec3(BOX_HOME.x, BOX_HOME.y, BOX_HOME.z));
    const parcel = new Mesh();
    parcel.box(0, 0, 0, BOX_SIZE.x, BOX_SIZE.y, BOX_SIZE.z, cardboard);
    parcel.box(0, 9.03, 0, 5.2, 0.07, BOX_SIZE.z, tape);
    parcel.box(0, 6, 10.03, 5.2, 6, 0.07, tape);
    parcel.box(4.7, 1.4, 10.08, 7.4, 3.8, 0.08, paper);
    for (let i = 0; i < 9; i++) {
      parcel.box(2.2 + i * 0.55, 1.4, 10.14, i % 3 === 0 ? 0.3 : 0.15, 2.3, 0.06, ink);
    }
    parcel.make(this.box, material);

    const key = new Mesh();
    // The key is ordinary opaque geometry and has no input to the coverage calculation.
    key.ring(-7.0, 0.65, -49.0, 1.8, 0.9, gold);
    key.box(-3.8, 0.46, -49.0, 4.4, 0.38, 0.9, gold);
    key.box(-2.8, 0.46, -48.3, 0.6, 0.38, 1.05, gold);
    key.box(-1.7, 0.46, -48.2, 0.7, 0.38, 1.25, gold);
    key.make(child(root, "Key", vec3.zero()), material);

    const colors: Record<Cue, Color> = {
      idle: [0.26, 0.30, 0.32],
      blocked: [1.0, 0.67, 0.22],
      new: [0.39, 0.92, 1.0],
      seen: [0.36, 0.86, 0.66],
    };
    this.badges = ZONES.map(zone => {
      const makeBadge = (cue: Cue): SceneObject => {
        const badge = child(root, zone.name + " " + cue, new vec3(zone.x, 0, 0));
        const mesh = new Mesh();
        // The badge stays on the front lip even if the zone is behind a prop.
        mesh.box(0, -1.6, 0.30, 8, 0.75, 0.45, colors[cue]);
        if (cue === "new" || cue === "seen") {
          for (const x of [-4.8, 4.8]) {
            for (const z of [zone.z - 3.8, zone.z + 3.8]) {
              mesh.box(x * 0.83, 0.09, z, 2.3, 0.10, 0.34, colors[cue]);
              mesh.box(x, 0.09, z + (z > zone.z ? -0.83 : 0.83), 0.34, 0.10, 2.1, colors[cue]);
            }
          }
        }
        mesh.make(badge, material);
        badge.enabled = cue === "idle";
        return badge;
      };
      return { idle: makeBadge("idle"), blocked: makeBadge("blocked"), new: makeBadge("new"), seen: makeBadge("seen") };
    });
  }

  blocker(): Blocker {
    const p = this.box.getTransform().getLocalPosition();
    return {
      min: { x: p.x - BOX_SIZE.x / 2, y: p.y - BOX_SIZE.y / 2, z: p.z - BOX_SIZE.z / 2 },
      max: { x: p.x + BOX_SIZE.x / 2, y: p.y + BOX_SIZE.y / 2, z: p.z + BOX_SIZE.z / 2 },
    };
  }

  show(zone: number, cue: Cue): void {
    const badges = this.badges[zone];
    for (const name of Object.keys(badges) as Cue[]) {
      badges[name].enabled = name === cue;
    }
  }
}
