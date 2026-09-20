import { describe, expect, it } from "vitest";
import {
  formatSnapshotClientPortfolioSgd,
  snapshotClientPortfolioCaptured,
} from "./snapshot-display";

describe("snapshot client portfolio display", () => {
  it("shows em dash when client portfolio was not captured", () => {
    expect(snapshotClientPortfolioCaptured({ clientPortfolio: null })).toBe(false);
    expect(
      formatSnapshotClientPortfolioSgd({ clientPortfolio: null })
    ).toBe("—");
  });

  it("formats captured client portfolio including zero", () => {
    expect(snapshotClientPortfolioCaptured({ clientPortfolio: 0 })).toBe(true);
    expect(formatSnapshotClientPortfolioSgd({ clientPortfolio: 3_900 })).toBe(
      "S$3,900.00"
    );
  });
});
