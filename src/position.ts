import { element, elements } from "./dom";

const holding = async (
  opt: { direction: "long" | "short"; size: number } = {
    direction: "long",
    size: 0,
  },
): Promise<true> => {
  return new Promise(async (resolve) => {
    const fn = () => ({
      check: async () => {
        const positions = await Promise.all(
          (
            await elements(
              `//main/div/div[3]//div[@data-scope="tabs" and @data-part="content"][2]//tbody/tr`,
            )
          ).map(async (p) => await parseRow(p)),
        );
        for (let p of positions) {
          if (p.direction == opt.direction) {
            if (opt.size === 0 || p.size === opt.size) {
              return true;
            }
          }
        }
        return false;
      },
    });
    const result = fn();
    if (await result.check()) {
      return resolve(true);
    }
    const observer = new MutationObserver(async () => {
      const check = fn();
      if (await check.check()) {
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(
      await element(
        "//main//div[3]/div[1]/div[1]/div/p", // price tag above chart
      ),
      { childList: true, subtree: true, characterData: true },
    );
  });
};

const parseRow = async (row: Node) => {
  const betSize = parseInt(
    ((await element("(//main//input)[1]/@value")) as HTMLInputElement).value,
  );
  const leverageSet = parseInt(
    (
      await element(
        '//main/div/div[2]//button[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
      )
    ).textContent!,
  );
  const leverageRow = Math.ceil(
    // 164.8 => 165
    parseFloat(
      (
        await element(
          './/td//p[substring(text(), string-length(text()) - string-length("x") + 1) = "x"]',
          { base: row },
        )
      ).textContent!.replaceAll(",", ""),
    ),
  );
  const leverage =
    leverageRow <= leverageSet && leverageRow / leverageSet >= 0.9
      ? leverageSet
      : leverageRow;
  const size = parseInt(
    (await element('.//td[starts-with(text(), "$ ")]', { base: row }))
      .textContent!.replaceAll(",", "")
      .substring(1),
  );
  const entryPrice = parseFloat(
    (await element(".//td[5]//p", { base: row })).textContent!.replaceAll(
      ",",
      "",
    ),
  );
  const currentPrice = parseFloat(
    (await element(".//td[6]//p", { base: row })).textContent!.replaceAll(
      ",",
      "",
    ),
  );
  const saveCount = Math.ceil(
    (size - betSize * leverage) / (betSize * leverage),
  );
  const liqPrice = parseFloat(
    (await element(".//td[7]//p", { base: row })).textContent!.replaceAll(
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

export { holding, parseRow };
