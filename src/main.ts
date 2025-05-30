// @ts-ignore isolatedModules
import { sound } from "./notification";
import { finder } from "@medv/finder";

const PERCENTAGE_SAVE = [-4, -9, -16, -25, -36, -49, -64, -81]; // -x% PNL to take action & alert on each save
const PERCENTAGE_MIN = 100; // we'll take profit if all positions >= this

const sleep = (seconds = 1) =>
  new Promise((resolve) => setTimeout(resolve, 1000 * seconds));

const randomInt = (
  min: number,
  max: number, // [min, max] both inclusive
) => Math.floor(Math.random() * (max - min + 1) + min);

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

const alert = throttle(async () => {
  const ctxAudio = new AudioContext();
  const srcAudio = ctxAudio.createBufferSource();
  const resp = await fetch(sound);
  ctxAudio.decodeAudioData(
    await resp.arrayBuffer(),
    (buffer) => {
      srcAudio.buffer = buffer;
      srcAudio.connect(ctxAudio.destination);
      srcAudio.start(0);
    },
    console.error,
  );
});

const logger = (() => {
  // Create the host element for the shadow DOM
  // steal from https://github.com/philc/vimium/blob/fbd791ac13baac6cf2ddc563ce529e7a7b856dad/content_scripts/vimium_frontend.js#L358C13-L371
  const shadowWrapper = document.createElement("div");
  shadowWrapper.className = "vimium-reset";
  const shadowRoot = shadowWrapper.attachShadow({ mode: "open" });

  // Create the floating div element
  const div = document.createElement("div");
  div.className = "my-floating-log"; // Add a class for easy selection

  // Apply styles to the floating div
  div.style.position = "fixed";
  // div.style.top = "50%";
  // div.style.left = "50%";
  // div.style.transform = "translate(-50%, -50%)"; // Centering
  div.style.bottom = "0px";
  div.style.right = "0px";
  div.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
  div.style.color = "white";
  div.style.padding = "4px 20px";
  div.style.borderRadius = "5px";
  div.style.zIndex = "1000";
  div.style.textAlign = "right";
  div.style.whiteSpace = "pre";
  div.style.fontFamily = "monospace";
  div.style.display = "block"; // default as shown

  // Add content to the div
  div.innerText = "";

  // Append the floating div to the shadow root
  shadowRoot.appendChild(div);

  document.documentElement.appendChild(shadowWrapper);
  return div;
})();

const toggleLog = () => {
  // or we can do
  // const logger = document
  //   .querySelector(".vimium-reset")!.shadowRoot!.querySelector(".my-floating-log")! as HTMLDivElement;
  logger.style.display = logger.style.display === "none" ? "block" : "none";
};

const updateLog = (text: string) => {
  logger.innerText = text;
  refresher.update();
};

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

const openLong = async () => {
  (await waitForElementByXpath('//button[text()="Long"]')).click();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const openShort = async () => {
  (await waitForElementByXpath('//button[text()="Short"]')).click();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const waitForElementsByXpath = (xpath: string): Promise<XPathResult> => {
  return new Promise((resolve) => {
    if (
      document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        null,
      )
    ) {
      return resolve(
        document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
          null,
        ),
      );
    }
    const observer = new MutationObserver(() => {
      if (
        document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
          null,
        )
      ) {
        observer.disconnect();
        resolve(
          document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE,
            null,
          ),
        );
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

const parseRow = async (row: Node) => {
  const betSize = parseInt(
    (
      (await waitForElementByXpath(
        "(//main//input)[1]/@value",
      )) as HTMLInputElement
    ).value,
  );
  const leverageSet = parseInt(
    (
      await waitForElementByXpath(
        '//main/div/div[2]//button[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
      )
    ).textContent!,
  );
  const leverageRow = Math.ceil(
    // 164.8 => 165
    parseFloat(
      (
        await waitForElementByXpath(
          './/td//p[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
          row,
        )
      ).textContent!.replaceAll(",", ""),
    ),
  );
  const leverage =
    leverageRow <= leverageSet && leverageRow / leverageSet >= 0.9
      ? leverageSet
      : leverageRow;
  const size = parseInt(
    (await waitForElementByXpath('.//td[starts-with(text(), "$ ")]', row))
      .textContent!.replaceAll(",", "")
      .substring(1),
  );
  const entryPrice = parseFloat(
    (await waitForElementByXpath(".//td[5]//p", row)).textContent!.replaceAll(
      ",",
      "",
    ),
  );
  const currentPrice = parseFloat(
    (await waitForElementByXpath(".//td[6]//p", row)).textContent!.replaceAll(
      ",",
      "",
    ),
  );
  const saveCount = Math.ceil(
    (size - betSize * leverage) / (betSize * leverage),
  );
  const liqPrice = parseFloat(
    (await waitForElementByXpath(".//td[7]//p", row)).textContent!.replaceAll(
      ",",
      "",
    ),
  );
  const direction = liqPrice <= entryPrice ? "long" : "short";
  const percentage =
    ((direction === "long" ? 100 : -100) *
      leverage *
      (currentPrice - entryPrice)) /
    entryPrice;
  return {
    betSize,
    leverage,
    size,
    entryPrice,
    liqPrice,
    percentage,
    direction: direction as "long" | "short",
    saveCount,
  };
};

const reducePosition = async () => {
  const rows = await waitForElementsByXpath(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody/tr`,
  );
  let row;
  while ((row = rows.iterateNext())) {
    const { size, betSize, leverage, entryPrice } = await parseRow(row);
    const sizeToReduce = size - betSize * leverage;
    if (
      sizeToReduce > 0
      // we need to reduce position size for this order
      // 1. if percentage is negtive, we'll reduce when we get back even
      // 2. if percentage is positive, we take profit now
    ) {
      (await waitForElementByXpath('.//td//p[text()="Limit"]', row)).click();

      const inputPrice = (await waitForElementByXpath(
        '(//*[starts-with(@id,"dialog")]//input)[1]',
      )) as HTMLInputElement;
      inputSetter.call(inputPrice, entryPrice);
      inputPrice.dispatchEvent(new Event("input", { bubbles: true }));
      const inputSize = (await waitForElementByXpath(
        '(//*[starts-with(@id,"dialog")]//input)[2]',
      )) as HTMLInputElement;
      inputSetter.call(inputSize, sizeToReduce);
      inputSize.dispatchEvent(new Event("input", { bubbles: true }));

      (await waitForElementByXpath('//button[text()="Close"]')).click();

      return; // since we click "Limit", the doc has mutated, following loop can not be executed.
    }
  }
};

const clearOpenOrders = async () => {
  const rows = await waitForElementsByXpath(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][3]//tbody/tr`,
  );
  let row;
  const cancels = [];
  while ((row = rows.iterateNext())) {
    cancels.push(
      await waitForElementByXpath('.//button[text()="Cancel"]', row),
    );
  }
  for (let cancel of cancels) {
    cancel.click();
  }
};

const sellAllMarket = async () => {
  const rows = await waitForElementsByXpath('//p[text()="Market"]');
  let row;
  const markets = [];
  while ((row = rows.iterateNext())) {
    markets.push(row);
  }
  for (let market of markets) {
    (market as HTMLElement).click();
  }
};

const switchLeft = async () => {
  const currentTabText = (
    await waitForElementByXpath(
      '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]',
    )
  ).textContent;
  if (currentTabText !== "Public Trades") {
    (
      await waitForElementByXpath(
        '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]/preceding-sibling::*[1]',
      )
    ).click();
  }
};

const switchRight = async () => {
  const currentTabText = (
    await waitForElementByXpath(
      '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]',
    )
  ).textContent;
  if (currentTabText !== "Transaction History") {
    (
      await waitForElementByXpath(
        '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]/following-sibling::*[1]',
      )
    ).click();
  }
};

// get div by content
const waitForElementByXpath = (
  xpath: string,
  base: Node = document,
): Promise<HTMLElement> => {
  return new Promise((resolve) => {
    if (
      document.evaluate(
        xpath,
        base,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue
    ) {
      return resolve(
        document.evaluate(
          xpath,
          base,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue as HTMLElement,
      );
    }
    const observer = new MutationObserver(() => {
      if (
        document.evaluate(
          xpath,
          base,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue
      ) {
        observer.disconnect();
        resolve(
          document.evaluate(
            xpath,
            base,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          ).singleNodeValue as HTMLElement,
        );
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

// get index of tab
const getIdx = async () => {
  const currentTabText = (
    await waitForElementByXpath(
      '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]',
    )
  ).textContent!;
  let idx = 0;
  if (currentTabText === "Public Trades") {
    idx = 1;
  } else if (currentTabText.startsWith("Positions ")) {
    idx = 2;
  } else if (currentTabText.startsWith("Open Orders ")) {
    idx = 3;
  } else if (currentTabText === "Trade History") {
    idx = 4;
  } else if (currentTabText === "Transaction History") {
    idx = 5;
  }
  return idx;
};

const inputSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  "value",
)!.set!;

const bindKeys = async () => {
  document.addEventListener(
    "keydown",
    async (e) => {
      // ignore if we are in a input field
      if (document.activeElement instanceof HTMLInputElement) {
        return;
      }
      if (e.key === "a") {
        e.preventDefault();
        (await waitForElementByXpath('//button[text()="Long"]')).click();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else if (e.key === "o") {
        e.preventDefault();
        (await waitForElementByXpath('//button[text()="Short"]')).click();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else if (e.key === "`") {
        // "`" to reset leverage & collateral to 1 to be safe
        const inputBetSize = (await waitForElementByXpath(
          "(//main//input)[1]",
        )) as HTMLInputElement;
        inputSetter.call(inputBetSize, 1);
        inputBetSize.dispatchEvent(new Event("input", { bubbles: true }));
        const leverage = parseInt(
          (
            await waitForElementByXpath(
              '//main/div/div[2]//button[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
            )
          ).textContent!,
        );
        (
          await waitForElementByXpath(
            '//main/div/div[2]//button[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
          )
        ).click();
        const inputLeverage = (await waitForElementByXpath(
          `//input[@value="${leverage}"]`,
        )) as HTMLInputElement;
        inputSetter.call(inputLeverage, 1);
        inputLeverage.dispatchEvent(new Event("input", { bubbles: true }));
        (
          await waitForElementByXpath(
            '//div[@data-scope="dialog" and @data-part="content" and @data-state="open"]//button[text()="Confirm"]',
          )
        ).click();
      } else if (e.key === "e") {
        // "e" to select previous tab
        await switchLeft();
      } else if (e.key === "u") {
        // "u" to select next tab
        await switchRight();
      } else if (e.key === "j") {
        // "j" to sell over boughts
        await reducePosition();
      } else if (e.key === "k") {
        // "k" to clear open orders
        await clearOpenOrders();
      } else if (e.key === "q") {
        // show log
        toggleLog();
      } else if (e.key === "p") {
        window.location.reload();
      } else if (e.key === "'") {
        // "'" to sell all market
        await sellAllMarket();
      }
    },
    true,
  );
};

const scrollDown = async () => {
  (
    await waitForElementByXpath(
      '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[starts-with(text(), "Positions (2")]',
    )
  ).click();
  const idx = await getIdx();
  if (idx !== 2) {
    console.log("check idx!");
    return;
  }
  const rows = await waitForElementsByXpath(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][${idx}]//tbody/tr`,
  );
  let row, lastRow;
  while ((row = rows.iterateNext())) {
    if (row) {
      lastRow = row;
    }
  }
  if (lastRow) {
    (await waitForElementByXpath("//main/following-sibling::div[1]")).hidden =
      true;
    (lastRow as HTMLElement).scrollIntoView({
      block: "end",
      inline: "nearest",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    await sleep();
    window.scrollTo({ top: 90, behavior: "smooth" });
  }
};

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

const watchPositions = async () => {
  new MutationObserver(async () => {
    if (!locker.lock()) {
      return;
    }
    try {
      const rows = await waitForElementsByXpath(
        `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody/tr`,
      );
      let row;
      const positions = [];
      while ((row = rows.iterateNext())) {
        positions.push(await parseRow(row));
      }
      const saveCount = positions.reduce(
        (acc, cur) => (cur.saveCount >= acc.saveCount ? cur : acc),
        { saveCount: 0 },
      ).saveCount;
      const shouldAutoOpen = saveCount < PERCENTAGE_SAVE.length;
      const threshould = shouldAutoOpen
        ? PERCENTAGE_SAVE[saveCount]
        : PERCENTAGE_SAVE[PERCENTAGE_SAVE.length - 1];

      if (positions.length < 2) {
        for (let i = 0; i < 10; i++) {
          console.log("just one direction!");
          alert();
          await sleep();
        }
      } else if (positions.length === 2) {
        const total = positions.reduce((acc, cur) => acc + cur.percentage, 0);
        updateLog(
          positions.reduce(
            (acc, cur) => `${acc}${cur.percentage.toFixed(2)}\n`,
            "",
          ) +
            `(${threshould}${shouldAutoOpen ? "" : " ↑↑↑"})      ${total.toFixed(2)}`,
        );
        if (positions.every((p) => p.percentage >= PERCENTAGE_MIN)) {
          await sellAllMarket();
          const sec = randomInt(60, 600);
          console.log(`sleeping ${sec}s!`);
          let _sec = sec;
          setInterval(() => {
            // prevent refresh by our 10s non watch rule
            _sec--;
            if (_sec > 0) {
              updateLog(`waiting ${_sec}s...`);
            }
          }, 1000);
          await sleep(sec);
          await openLong();
          await sleep(0.05);
          await openShort();
          await sleep(5);
          window.location.reload();
        }
      }
      for (let position of positions) {
        if (position.percentage <= threshould) {
          alert();
          if (shouldAutoOpen) {
            switch (position.direction) {
              case "long":
                await openLong();
                break;
              case "short":
                await openShort();
                break;
            }
            // wait for open order to be filled
            await waitForElementByXpath(
              `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody/tr/td[starts-with(text(), "$ ${new Intl.NumberFormat(
                "en-US",
                {
                  style: "currency",
                  currency: "USD",
                },
              )
                .format(position.size + position.betSize * position.leverage)
                .substring(1)}")]`,
            );
            // clean previously orders (if any)
            await clearOpenOrders();
            await waitForElementByXpath(
              '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[text()="Open Orders (0)"]',
            );
            // open new reduce position order
            await reducePosition();
          }
        }
      }
    } catch (e) {
      console.error(
        "Document mutated during iteration, continuing to next check...",
        e,
      );
    }
    locker.unlock();
  }).observe(
    await waitForElementByXpath(
      `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody`,
    ),
    {
      childList: true,
      subtree: true,
      characterData: true,
    },
  );
};

if (import.meta.env.DEV) {
  document.addEventListener("click", (event) => {
    const selector = finder(event.target as any);
    console.log("==============", { selector });
  });
}

await bindKeys();
await scrollDown();
await watchPositions();
setInterval(() => {
  refresher.refresh();
}, 1000);
