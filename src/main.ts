// @ts-ignore isolatedModules

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
      const long = await waitForElementByXpath('//div[text()="Long"]');
      long.click();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const short = await waitForElementByXpath('//div[text()="Short"]');
      short.click();
    } else if (e.key === "1") {
      // number 1 to place order
      const trade = await waitForElementByXpath('//button[text()="Trade"]');
      trade.click();
    } else if (e.key === "2") {
      // number 2 to place order
      e.preventDefault(); // prevent inserting 2 into input field
      // Create a race between the two element queries to use whichever returns first
      const [element, elType] = await Promise.race([
        waitForElementByXpath('//div[text()="+ Add"]').then((el) => [
          el,
          "tpSl",
        ]),
        waitForElementByXpath(
          '(//*[starts-with(@id,"tabs")]//*[local-name() = "svg"])[2]',
        ).then((el) => [el, "edit"]),
      ]);
      if (elType === "tpSl") {
        (element as HTMLElement).click();
      } else {
        (element as HTMLElement).dispatchEvent(
          new Event("click", { bubbles: true }),
        );
      }
      const input = (await waitForElementByXpath(
        '(//*[starts-with(@id,"dialog")]//input)[2]',
      )) as HTMLInputElement;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set;
      nativeInputValueSetter!.call(input, "6");
      const event = new Event("input", { bubbles: true });
      input.dispatchEvent(event);

      const confirm = await waitForElementByXpath('//button[text()="Confirm"]');
      confirm.click();
    } else if (e.key === " ") {
      // space to sell market
      e.preventDefault(); // prevent scrolling
      const market = await waitForElementByXpath('//p[text()="Market"]');
      market.click();
    }
  });
};

bindKeys();
