import { BackPlate } from "SpectaclesUIKit.lspkg/Scripts/BackPlate";
import { Button } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button";
import { ElementContent } from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent";
import { FlexItem } from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem";
import { FlexLayout } from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout";
import { FlexAlign, FlexDirection, FlexJustify } from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes";

function child(parent: SceneObject, name: string): SceneObject {
  const object = global.scene.createSceneObject(name);
  object.setParent(parent);
  return object;
}

export class SearchlightUI {
  private readonly progress: Text;
  private readonly hint: Text;
  private readonly action: ElementContent;

  constructor(shelf: SceneObject, onPress: () => void) {
    const panel = child(shelf, "Search controls");
    panel.getTransform().setLocalPosition(new vec3(0, 27, -2));
    panel.createComponent("Component.Canvas");
    const plate = panel.createComponent(BackPlate.getTypeName()) as BackPlate;
    plate.size = new vec2(58, 15.5);
    const content = child(panel, "Controls content");
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.65));
    const layout = content.createComponent(FlexLayout.getTypeName()) as FlexLayout;
    layout.autoDiscoverItemsOnStart = false;
    layout.onInitialized.add(() => {
      layout.width = 56;
      layout.height = 14;
      layout.direction = FlexDirection.Column;
      layout.alignItems = FlexAlign.Center;
      layout.justifyContent = FlexJustify.Center;
      layout.rowGap = 0.42;
    });

    const row = (name: string, width: number, height: number): SceneObject => {
      const object = child(content, name);
      const item = object.createComponent(FlexItem.getTypeName()) as FlexItem;
      item.overrideWidth = width;
      item.overrideHeight = height;
      item.flexShrink = 0;
      layout.addItems([item]);
      return object;
    };
    const label = (name: string, height: number, size: number): Text => {
      const text = row(name, 54, height).createComponent("Component.Text") as Text;
      text.size = size;
      text.depthTest = true;
      text.horizontalAlignment = HorizontalAlignment.Center;
      text.verticalAlignment = VerticalAlignment.Center;
      text.horizontalOverflow = HorizontalOverflow.Wrap;
      text.verticalOverflow = VerticalOverflow.Overflow;
      text.layoutRect = Rect.create(-27, 27, -height / 2, height / 2);
      return text;
    };

    this.progress = label("Coverage", 2.8, 58);
    this.hint = label("Search hint", 3.5, 42);
    const actionObject = row("Start or reset search", 22, 5.0);
    const button = actionObject.createComponent(Button.getTypeName()) as Button;
    button.onInitialized.add(() => { button.size = new vec3(22, 5.0, 1); });
    button.onTriggerUp.add(onPress);
    this.action = actionObject.createComponent(ElementContent.getTypeName()) as ElementContent;
    this.action.textSize = 42;
    this.action.autoResize = false;
    this.action.contentAlignment = "center";
    this.set(false, 0, 3, "Find the key on this simulated shelf.");
  }

  set(active: boolean, checked: number, total: number, message: string): void {
    this.progress.text = active ? checked + " / " + total + " zones seen" : "SEARCHLIGHT";
    this.hint.text = message;
    this.action.text = active ? "Reset" : "Start search";
  }
}
