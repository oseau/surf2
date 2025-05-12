// @ts-ignore isolatedModules
import { sound } from "./notification";

const sleep = (seconds = 1) =>
  new Promise((resolve) => setTimeout(resolve, 1000 * seconds));

const audioPlay = async () => {
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
      if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        (await waitForElementByXpath('//button[text()="Long"]')).click();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else if (e.key === "ArrowRight" || e.key === "o") {
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
      } else if (e.key === "u") {
        // "u" to select next tab
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
      } else if (e.key === "j") {
        // "j" to sell over boughts
        const idx = await getIdx();
        if (idx !== 2) {
          console.log("check idx!");
          return;
        }
        const rows = await waitForElementsByXpath(
          `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][${idx}]//tbody/tr`,
        );
        let row;
        while ((row = rows.iterateNext())) {
          const betSize = parseInt(
            (
              (await waitForElementByXpath(
                "(//main//input)[1]/@value",
              )) as HTMLInputElement
            ).value,
          );
          const leverage = parseInt(
            (
              await waitForElementByXpath(
                './/td//p[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
                row,
              )
            ).textContent!.replaceAll(",", ""),
          );
          const size = parseInt(
            (
              await waitForElementByXpath(
                './/td[starts-with(text(), "$ ")]',
                row,
              )
            )
              .textContent!.replaceAll(",", "")
              .substring(1),
          );
          const entryPrice = parseFloat(
            (
              await waitForElementByXpath(".//td[5]//p", row)
            ).textContent!.replaceAll(",", ""),
          );
          const sizeToReduce = size - betSize * leverage;
          if (
            sizeToReduce > 0
            // we need to reduce position size for this order
            // 1. if percentage is negtive, we'll reduce when we get back even
            // 2. if percentage is positive, we take profit now
          ) {
            (
              await waitForElementByXpath('.//td//p[text()="Limit"]', row)
            ).click();

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
      } else if (e.key === "k") {
        // "k" to clear open orders
        const idx = await getIdx();
        if (idx !== 3) {
          console.log("check idx!");
          return;
        }
        const rows = await waitForElementsByXpath(
          `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][${idx}]//tbody/tr`,
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
      } else if (e.key === "p") {
        window.location.reload();
      } else if (e.key === " ") {
        // space to sell all market
        e.preventDefault(); // prevent scrolling
        const rows = await waitForElementsByXpath('//p[text()="Market"]');
        let row;
        const markets = [];
        while ((row = rows.iterateNext())) {
          markets.push(row);
        }
        for (let market of markets) {
          (market as HTMLElement).click();
        }
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
    (lastRow as HTMLElement).scrollIntoView({
      block: "end",
      inline: "nearest",
    });
    window.scrollBy(0, 8);
  }
};

let countNonWatchSeconds = 0;

const watchPositions = async () => {
  await sleep();
  const idx = await getIdx();
  if (countNonWatchSeconds % 60 === 30) {
    console.log("test", { idx, countNonWatchSeconds });
  }
  if (idx !== 2) {
    console.log("check idx!");
    countNonWatchSeconds++;
    if (countNonWatchSeconds >= 60) {
      // 1min non watch alert
      countNonWatchSeconds = 0;
      for (let i = 0; i < 10; i++) {
        audioPlay();
        await sleep();
      }
    }
    return await watchPositions();
  }
  countNonWatchSeconds = 0;
  const rows = await waitForElementsByXpath(
    `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][${idx}]//tbody/tr`,
  );
  let row;
  while ((row = rows.iterateNext())) {
    const percentage = parseFloat(
      (
        await waitForElementByXpath('.//td//p[starts-with(text(),"(")]', row)
      ).textContent!.replace("(", ""),
    );
    if (percentage <= -50) {
      // -50% position alert
      audioPlay();
    }
  }
  await watchPositions();
};

bindKeys();
scrollDown();
watchPositions();
