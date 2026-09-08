import { describe, expect, test } from "vitest";
import {
  calculateQrCrop,
  calculateTemplateCrop,
  type QrLocation,
} from "../../scripts/wechat-card/qr-crop";

const centeredQr: QrLocation = {
  topLeftCorner: { x: 140, y: 380 },
  topRightCorner: { x: 680, y: 380 },
  bottomRightCorner: { x: 680, y: 920 },
  bottomLeftCorner: { x: 140, y: 920 },
};

describe("calculateQrCrop", () => {
  test("creates a square crop with quiet-zone padding", () => {
    expect(
      calculateQrCrop(centeredQr, { width: 820, height: 1219 }),
    ).toEqual({ left: 96, top: 336, width: 628, height: 628 });
  });

  test("keeps the square crop inside the source image", () => {
    const edgeQr: QrLocation = {
      topLeftCorner: { x: 2, y: 3 },
      topRightCorner: { x: 82, y: 3 },
      bottomRightCorner: { x: 82, y: 83 },
      bottomLeftCorner: { x: 2, y: 83 },
    };

    expect(calculateQrCrop(edgeQr, { width: 100, height: 100 })).toEqual({
      left: 0,
      top: 0,
      width: 96,
      height: 96,
    });
  });
});

describe("calculateTemplateCrop", () => {
  test("returns the normalized crop for an original WeChat contact card", () => {
    expect(calculateTemplateCrop({ width: 820, height: 1219 })).toEqual({
      left: 90,
      top: 329,
      width: 631,
      height: 631,
    });
  });
});
