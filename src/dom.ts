const element = (
  xpath: string,
  opt: { base: Node } = { base: document },
): Promise<HTMLElement> => {
  return new Promise(async (resolve) => {
    return resolve(
      (await elements(xpath, { base: opt.base, single: true }))[0],
    );
  });
};

const elements = (
  xpath: string,
  opt: { base: Node; single: boolean } = { base: document, single: false },
): Promise<HTMLElement[]> => {
  const fn = () => {
    const result = document.evaluate(
      xpath,
      opt.base,
      null,
      opt.single
        ? XPathResult.FIRST_ORDERED_NODE_TYPE
        : XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null,
    );
    return {
      check: () => (opt.single ? result.singleNodeValue : result),
      value: () => {
        if (opt.single) {
          return [result.singleNodeValue as HTMLElement];
        }
        let v;
        const values = [];
        while ((v = result.iterateNext())) {
          values.push(v as HTMLElement);
        }
        return values;
      },
    };
  };

  return new Promise((resolve) => {
    const result = fn();
    if (result.check()) {
      return resolve(result.value());
    }
    const observer = new MutationObserver(() => {
      const check = fn();
      if (check.check()) {
        observer.disconnect();
        resolve(check.value());
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

export { element, elements };
