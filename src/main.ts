// @ts-ignore isolatedModules

declare const unsafeWindow: Window;

// Initialize isTesting on unsafeWindow
(unsafeWindow as any).doneTestBuy = false;
(unsafeWindow as any).doneTestSell = false;

const isDoneTesting = (testType: "buy" | "sell") => {
  return (unsafeWindow as any)[
    `doneTest${testType === "buy" ? "Buy" : "Sell"}`
  ];
};

// get div by content
const waitForElementByXpath = (xpath: string): Promise<HTMLElement> => {
  return new Promise((resolve) => {
    if (
      document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue
    ) {
      return resolve(
        document.evaluate(
          xpath,
          document,
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
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue
      ) {
        observer.disconnect();
        resolve(
          document.evaluate(
            xpath,
            document,
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

const bindKeys = async () => {
  document.addEventListener("keydown", async (e) => {
    // ignore if we are in a input field
    if (document.activeElement instanceof HTMLInputElement) {
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const long = await waitForElementByXpath('//button[text()="Long"]');
      if (!isDoneTesting("buy")) {
        console.log("doing test for long button, we got element:", long);
      } else {
        long.click();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const short = await waitForElementByXpath('//button[text()="Short"]');
      if (!isDoneTesting("buy")) {
        console.log("doing test for short button, we got element:", short);
      } else {
        short.click();
      }
    } else if (e.key === "`") {
      // "`" to update our bet size to 0.5%
      const total = (
        await waitForElementByXpath(
          '//nav//*[contains(@id, "hover-card")]/div[1]/text()[normalize-space()]',
        )
      ).textContent;
      const betSize = parseInt(total!) / 200;
      if (!isDoneTesting("buy")) {
        console.log("doing test for bet size, we will insert:", betSize);
        return;
      }
      const inputBetSize = (await waitForElementByXpath(
        "(//main//input)[1]",
      )) as HTMLInputElement;
      const nativeInputValueSetterBetSize = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set;
      nativeInputValueSetterBetSize!.call(inputBetSize, betSize);
      const eventBetSize = new Event("input", { bubbles: true });
      inputBetSize.dispatchEvent(eventBetSize);
    } else if (e.key === "1") {
      // number 1 to take profit 1%
      e.preventDefault(); // prevent inserting 1 into input field
      // Create a race between the two element queries to use whichever returns first
      const [element, elType] = await Promise.race([
        waitForElementByXpath('//div[text()="+ Add"]').then((el) => [
          el,
          "tpSl",
        ]),
        waitForElementByXpath(
          '(//*[starts-with(@id,"tabs")]//tr//*[local-name() = "svg"])[3]',
        ).then((el) => [el, "edit"]),
      ]);
      if (elType === "tpSl") {
        (element as HTMLElement).click();
      } else {
        (element as HTMLElement).dispatchEvent(
          new Event("click", { bubbles: true }),
        );
      }
      const inputTakeProfit = (await waitForElementByXpath(
        '(//*[starts-with(@id,"dialog")]//input)[2]',
      )) as HTMLInputElement;
      const nativeInputValueSetterTakeProfit = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set;
      nativeInputValueSetterTakeProfit!.call(inputTakeProfit, "1");
      const eventTakeProfit = new Event("input", { bubbles: true });
      inputTakeProfit.dispatchEvent(eventTakeProfit);

      const confirm = await waitForElementByXpath('//button[text()="Confirm"]');
      if (!isDoneTesting("sell")) {
        console.log("doing test for confirm button, we got element:", confirm);
      } else {
        confirm.click();
      }
    } else if (e.key === "2") {
      // number 2 to take profit 65%
      e.preventDefault(); // prevent inserting 2 into input field
      // Create a race between the two element queries to use whichever returns first
      const [element, elType] = await Promise.race([
        waitForElementByXpath('//div[text()="+ Add"]').then((el) => [
          el,
          "tpSl",
        ]),
        waitForElementByXpath(
          '(//*[starts-with(@id,"tabs")]//tr//*[local-name() = "svg"])[3]',
        ).then((el) => [el, "edit"]),
      ]);
      if (elType === "tpSl") {
        (element as HTMLElement).click();
      } else {
        (element as HTMLElement).dispatchEvent(
          new Event("click", { bubbles: true }),
        );
      }
      const inputTakeProfit = (await waitForElementByXpath(
        '(//*[starts-with(@id,"dialog")]//input)[2]',
      )) as HTMLInputElement;
      const nativeInputValueSetterTakeProfit = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set;
      nativeInputValueSetterTakeProfit!.call(inputTakeProfit, "65");
      const eventTakeProfit = new Event("input", { bubbles: true });
      inputTakeProfit.dispatchEvent(eventTakeProfit);

      const confirm = await waitForElementByXpath('//button[text()="Confirm"]');
      if (!isDoneTesting("sell")) {
        console.log("doing test for confirm button, we got element:", confirm);
      } else {
        confirm.click();
      }
    } else if (e.key === " ") {
      // space to sell market
      e.preventDefault(); // prevent scrolling
      const market = await waitForElementByXpath('//p[text()="Market"]');
      if (!isDoneTesting("sell")) {
        console.log("doing test for market button, we got element:", market);
      } else {
        market.click();
      }
    }
  });
};

bindKeys();
