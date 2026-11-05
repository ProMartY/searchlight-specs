import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { BOX_ASIDE_X, BOX_HOME, BOX_SIZE, Cue, SearchShelf, ZONES } from "./SearchShelf";
import { SearchlightUI } from "./SearchlightUI";
import { sampleState } from "./SearchVisibility";
import type { Point3 } from "./SearchVisibility";

const material = requireAsset("../SimpleVertexBaseColor.lspkg/vertexBaseColorMaterial.mat") as Material;
const shelfDistance = 146;
const settleSeconds = 0.75;
const slideSeconds = 0.38;

const zoneSamples: Point3[][] = ZONES.map(zone => [
  { x: zone.x, y: 0.18, z: zone.z },
  { x: zone.x - 3.5, y: 0.18, z: zone.z - 2.6 },
  { x: zone.x - 3.5, y: 0.18, z: zone.z + 2.6 },
  { x: zone.x + 3.5, y: 0.18, z: zone.z - 2.6 },
  { x: zone.x + 3.5, y: 0.18, z: zone.z + 2.6 },
]);

type ZoneProgress = { covered: boolean; dwell: number; cue: Cue };

@component
export class Searchlight extends BaseScriptComponent {
  private camera: Camera;
  private shelf: SearchShelf;
  private ui: SearchlightUI;
  private active = false;
  private viewKey = "";
  private readonly progress: ZoneProgress[] = ZONES.map(() => ({ covered: false, dwell: 0, cue: "idle" }));
  private slide: { from: number; to: number; elapsed: number } | null = null;

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.start());
    this.createEvent("LateUpdateEvent").bind(() => this.update());
  }

  private start(): void {
    const scene = global.scene;
    for (let i = 0; i < scene.getRootObjectsCount(); i++) {
      const root = scene.getRootObject(i);
      if (root.name === "Camera Object") {
        this.camera = root.getComponent("Component.Camera") as Camera;
        break;
      }
    }
    if (!this.camera || !material) {
      print("Searchlight: template camera or vertex material is missing.");
      return;
    }

    const transform = this.camera.getTransform();
    const eye = transform.getWorldPosition();
    const forward = transform.back;
    const flat = new vec3(forward.x, 0, forward.z);
    const horizontal = flat.length < 0.01 ? new vec3(0, 0, -1) : flat.normalize();
    const root = scene.createSceneObject("Searchlight Shelf");
    root.getTransform().setWorldPosition(eye.add(horizontal.uniformScale(shelfDistance)).add(new vec3(0, -22, 0)));
    root.getTransform().setWorldRotation(quat.lookAt(horizontal.uniformScale(-1), vec3.up()));

    this.shelf = new SearchShelf(root, material);
    this.ui = new SearchlightUI(root, () => this.toggleSearch());

    const shape = Shape.createBoxShape();
    shape.size = new vec3(BOX_SIZE.x, BOX_SIZE.y, BOX_SIZE.z);
    const collider = this.shelf.box.createComponent("Physics.ColliderComponent") as ColliderComponent;
    collider.shape = shape;
    collider.intangible = true;
    const handle = this.shelf.box.createComponent(Interactable.getTypeName()) as Interactable;
    handle.onTriggerEnd.add(() => this.slideBox());
    print("Searchlight ready · simulated shelf");
  }

  private toggleSearch(): void {
    if (this.active) {
      this.reset();
    } else {
      this.active = true;
      this.refreshView(0, "Look across the shelf. Pinch the box to move it.");
    }
  }

  private reset(): void {
    this.active = false;
    this.slide = null;
    this.shelf.box.getTransform().setLocalPosition(new vec3(BOX_HOME.x, BOX_HOME.y, BOX_HOME.z));
    this.progress.forEach((zone, index) => {
      zone.covered = false;
      zone.dwell = 0;
      zone.cue = "idle";
      this.shelf.show(index, "idle");
    });
    this.refreshView(0, "Find the key on this simulated shelf.");
  }

  private slideBox(): void {
    if (!this.active || this.slide) return;
    const from = this.shelf.box.getTransform().getLocalPosition().x;
    this.slide = { from, to: from === BOX_HOME.x ? BOX_ASIDE_X : BOX_HOME.x, elapsed: 0 };
  }

  private refreshView(checked: number, hint: string): void {
    const key = this.active + "|" + checked + "|" + hint;
    if (key === this.viewKey) return;
    this.viewKey = key;
    this.ui.set(this.active, checked, ZONES.length, hint);
  }

  private update(): void {
    if (!this.active || !this.shelf) return;
    const dt = Math.min(getDeltaTime(), 0.05);
    if (this.slide) {
      this.slide.elapsed += dt;
      const t = Math.min(1, this.slide.elapsed / slideSeconds);
      const eased = t * t * (3 - 2 * t);
      const x = t === 1 ? this.slide.to : this.slide.from + (this.slide.to - this.slide.from) * eased;
      this.shelf.box.getTransform().setLocalPosition(new vec3(x, BOX_HOME.y, BOX_HOME.z));
      if (t === 1) this.slide = null;
    }

    const transform = this.shelf.root.getTransform();
    const world = transform.getWorldTransform();
    const eye = transform.getInvertedWorldTransform().multiplyPoint(this.camera.getTransform().getWorldPosition());
    const blockers = [this.shelf.blocker()];
    const inView = (point: Point3): boolean =>
      this.camera.isSphereVisible(world.multiplyPoint(new vec3(point.x, point.y, point.z)), 0.15);

    let checked = 0;
    let hidden = false;
    let candidate = false;
    for (let index = 0; index < this.progress.length; index++) {
      const zone = this.progress[index];
      const state = sampleState(zoneSamples[index], eye, blockers, inView);
      if (state === "clear" && !this.slide) {
        zone.dwell += dt;
        if (!zone.covered && zone.dwell >= settleSeconds) {
          zone.covered = true;
          print("Searchlight covered · " + ZONES[index].name);
        }
      } else {
        zone.dwell = 0;
      }
      if (zone.covered) checked++;
      const coveredNow = state === "clear" || state === "partial";
      const cue = state === "blocked" && !zone.covered ? "blocked"
        : coveredNow ? (zone.covered ? "seen" : "new") : "idle";
      if (zone.cue !== cue) {
        zone.cue = cue;
        this.shelf.show(index, cue);
      }
      if (!zone.covered) {
        hidden = hidden || state === "blocked";
        candidate = candidate || coveredNow;
      }
    }

    const hint = hidden ? "View blocked. Step sideways or pinch the box."
      : candidate ? "Blue marks a zone you can inspect now."
      : checked === ZONES.length ? "All three zones were in view."
      : "Look across the shelf.";
    this.refreshView(checked, hint);
  }
}
