const sleep = (seconds = 1) =>
  new Promise((resolve) => setTimeout(resolve, 1000 * seconds));

const throttle = (func: CallableFunction, seconds = 1) => {
  let inThrottle = false;
  return async (...args: any[]) => {
    if (!inThrottle) {
      inThrottle = true;
      func(...args);
      await sleep(seconds);
      inThrottle = false;
    }
  };
};

const randomInt = (
  min: number,
  max: number, // [min, max] both inclusive
) => Math.floor(Math.random() * (max - min + 1) + min);

const locker = (() => {
  let locked = false;
  return {
    lock: () => {
      if (locked) {
        return false;
      }
      locked = true;
      return true;
    },
    unlock: () => {
      locked = false;
    },
  };
})();

const refresher = (() => {
  // refresh if we did not receive data within last 10 seconds
  let latest = Date.now();
  return {
    update: () => (latest = Date.now()),
    refresh: () => {
      if ((Date.now() - latest) / 1000 >= 10) {
        window.location.reload();
      }
    },
  };
})();

const element = (
  xpath: string,
  base: Node = document,
): Promise<HTMLElement> => {
  const fn = () =>
    document.evaluate(
      xpath,
      base,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue as HTMLElement;
  return new Promise((resolve) => {
    const result = fn();
    if (result) {
      return resolve(result);
    }
    const observer = new MutationObserver(() => {
      const result = fn();
      if (result) {
        observer.disconnect();
        resolve(result);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

const elements = (xpath: string, base: Node = document): Promise<Node[]> => {
  const fn = () => {
    const results = document.evaluate(
      xpath,
      base,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null,
    );
    return {
      results,
      array: () => {
        let row;
        const positions = [];
        while ((row = results.iterateNext())) {
          positions.push(row);
        }
        return positions;
      },
    };
  };

  return new Promise((resolve) => {
    const check = fn();
    if (check.results) {
      return resolve(check.array());
    }
    const observer = new MutationObserver(() => {
      const check = fn();
      if (check.results) {
        observer.disconnect();
        resolve(check.array());
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

export { sleep, throttle, randomInt, locker, refresher, element, elements };
