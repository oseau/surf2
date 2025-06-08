import { GM_getValue, GM_setValue, GM_deleteValue } from "$";
import { elements } from "./dom";

const getValue = (key: string) => GM_getValue(key, null);

const isManual = () => getValue("manual") ?? true;

const toggleManual = () => {
  GM_setValue("manual", !isManual());
  resetStartPositionCount();
};

const getStartPositionCount = async () => {
  const count = getValue("position_count");
  if (count !== null) {
    return count;
  }
  const positions = await elements(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody/tr`,
  );
  GM_setValue("position_count", positions.length);
  return positions.length;
};

const resetStartPositionCount = () => {
  GM_deleteValue("position_count");
};

export { isManual, toggleManual, getStartPositionCount };
