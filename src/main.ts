// @ts-ignore isolatedModules
import { alert } from "./notification";
import { sleep, locker, refresher } from "./utils";
import { parseHolding, holding } from "./position";
import { element, elements } from "./dom";
import { finder } from "@medv/finder";

const PERCENTAGE_SAVE = [-1, -4, -9, -16, -25, -36, -49, -64, -81]; // -x% PNL to take action & alert on each save

const lockerOrder = locker();

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

const openLong = async () => {
  (await element('//button[text()="Long"]')).click();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const openShort = async () => {
  (await element('//button[text()="Short"]')).click();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const reducePosition = async () => {
  const positions = await elements(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody/tr`,
  );
  for (let position of positions) {
    const { size, betSize, leverage, entryPrice } =
      await parseHolding(position);
    const sizeToReduce = size - betSize * leverage;
    if (
      sizeToReduce > 0
      // we need to reduce position size for this order
      // 1. if percentage is negtive, we'll reduce when we get back even
      // 2. if percentage is positive, we take profit now
    ) {
      (await element('.//td//p[text()="Limit"]', { base: position })).click();

      const inputPrice = (await element(
        '(//*[starts-with(@id,"dialog")]//input)[1]',
      )) as HTMLInputElement;
      inputSetter.call(inputPrice, entryPrice);
      inputPrice.dispatchEvent(new Event("input", { bubbles: true }));
      const inputSize = (await element(
        '(//*[starts-with(@id,"dialog")]//input)[2]',
      )) as HTMLInputElement;
      inputSetter.call(inputSize, sizeToReduce);
      inputSize.dispatchEvent(new Event("input", { bubbles: true }));

      (await element('//button[text()="Close"]')).click();

      return; // since we click "Limit", the dom has mutated, following loop can not be executed.
    }
  }
};

const reduceLeverage = async (opt = { diff: 0 }) => {
  const leverage = parseInt(
    (
      await element(
        '//main/div/div[2]//button[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
      )
    ).textContent!,
  );
  (await element(`//main/div/div[2]//button[text() = "${leverage}x"]`)).click();
  const inputLeverage = (await element(
    `//input[@value="${leverage}"]`,
  )) as HTMLInputElement;
  const setTo =
    opt.diff === 0 ? 1 : leverage - opt.diff >= 1 ? leverage - opt.diff : 1;
  inputSetter.call(inputLeverage, setTo);
  inputLeverage.dispatchEvent(new Event("input", { bubbles: true }));
  (
    await element(
      '//div[@data-scope="dialog" and @data-part="content" and @data-state="open"]//button[text()="Confirm"]',
    )
  ).click();
};

const clearOpenOrders = async () => {
  const cancels = await elements(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][3]//tbody/tr//button[text()="Cancel"]`,
  );
  for (let cancel of cancels) {
    (cancel as HTMLElement).click();
  }
};

const sellAllMarket = async () => {
  const markets = await elements('//p[text()="Market"]');
  for (let market of markets) {
    (market as HTMLElement).click();
  }
};

const switchLeft = async () => {
  const currentTabText = (
    await element(
      '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]',
    )
  ).textContent;
  if (currentTabText !== "Public Trades") {
    (
      await element(
        '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]/preceding-sibling::*[1]',
      )
    ).click();
  }
};

const switchRight = async () => {
  const currentTabText = (
    await element(
      '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]',
    )
  ).textContent;
  if (currentTabText !== "Transaction History") {
    (
      await element(
        '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[@data-selected]/following-sibling::*[1]',
      )
    ).click();
  }
};

// get index of tab
const getIdx = async () => {
  const currentTabText = (
    await element(
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
        (await element('//button[text()="Long"]')).click();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else if (e.key === "o") {
        e.preventDefault();
        (await element('//button[text()="Short"]')).click();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else if (e.key === "`") {
        // "`" to reset leverage & collateral to 1 to be safe
        const inputBetSize = (await element(
          "(//main//input)[1]",
        )) as HTMLInputElement;
        inputSetter.call(inputBetSize, 1);
        inputBetSize.dispatchEvent(new Event("input", { bubbles: true }));
        await reduceLeverage();
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
        toggleLog();
      } else if (e.key === ";") {
        // for dev&debug
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
    await element(
      '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[starts-with(text(), "Positions (2")]',
    )
  ).click();
  const idx = await getIdx();
  if (idx !== 2) {
    console.log("check idx!");
    return;
  }
  const rows = await elements(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][${idx}]//tbody/tr`,
  );
  if (rows.length > 0) {
    (await element("//main/following-sibling::div[1]")).hidden = true;
    (rows[rows.length - 1] as HTMLElement).scrollIntoView({
      block: "end",
      inline: "nearest",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    await sleep();
    window.scrollTo({ top: 90, behavior: "smooth" });
  }
  await resetOpening();
};

const resetOpening = async () => {
  // reset, previous session may be blocked and have uneven positions
  await clearOpenOrders();
  await element(
    '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[text()="Open Orders (0)"]',
  );
  await reducePosition();
};

const watchPositions = async () => {
  new MutationObserver(async () => {
    if (!lockerOrder.lock()) {
      return;
    }
    try {
      const positions = await Promise.all(
        (
          await elements(
            `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody/tr`,
          )
        ).map(async (p) => await parseHolding(p)),
      );
      const saveCount = positions.reduce(
        (acc, cur) => (cur.saveCount >= acc.saveCount ? cur : acc),
        { saveCount: 0 },
      ).saveCount;
      const shouldAutoOpen = saveCount < PERCENTAGE_SAVE.length;
      const threshould = shouldAutoOpen
        ? PERCENTAGE_SAVE[saveCount]
        : PERCENTAGE_SAVE[PERCENTAGE_SAVE.length - 1];

      if (positions.length === 0) {
        updateLog("stay safe!");
      } else if (positions.length === 1) {
        console.log("just one direction!");
        alert();
      } else if (positions.length === 2) {
        const total = positions.reduce((acc, cur) => acc + cur.percentage, 0);
        updateLog(
          positions.reduce(
            (acc, cur) => `${acc}${cur.percentage.toFixed(2)}\n`,
            "",
          ) +
            `(${threshould}${shouldAutoOpen ? "" : " ↑↑↑"})      ${total.toFixed(2)}`,
        );
      }
      for (let position of positions) {
        if (position.percentage <= threshould) {
          alert(shouldAutoOpen ? 15 : 100); // louder if we've used all save tries
          if (shouldAutoOpen) {
            switch (position.direction) {
              case "long":
                await openLong();
                // wait for open order to be filled
                await holding({
                  direction: "long",
                  size: position.size + position.betSize * position.leverage,
                });
                break;
              case "short":
                await openShort();
                // wait for open order to be filled
                await holding({
                  direction: "short",
                  size: position.size + position.betSize * position.leverage,
                });
                break;
            }
            // clean previously orders (if any)
            await clearOpenOrders();
            await element(
              '//main/div/div[3]//div[@data-scope="tabs" and @data-part="list"]//button[text()="Open Orders (0)"]',
            );
            // open new reduce position order
            await reducePosition();
          }
        }
      }
    } catch (e) {
      console.error(
        "============== Document mutated during iteration, continuing to next check...",
        e,
      );
    }
    lockerOrder.unlock();
  }).observe(
    await element(
      "//main//div[3]/div[1]/div[1]/div/p", // price tag above chart
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
    const css = finder(event.target as any);
    console.log("==============", { css });
  });
}

bindKeys();
scrollDown();
watchPositions();
setInterval(() => {
  refresher.refresh();
}, 1000);
