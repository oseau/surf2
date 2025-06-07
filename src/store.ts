import { GM_getValue, GM_setValue } from "$";

const getValue = (key: string) => GM_getValue(key, null);

const isManual = () => getValue("manual") ?? true;

const toggleManual = () => {
  GM_setValue("manual", !isManual());
};

export { isManual, toggleManual };
