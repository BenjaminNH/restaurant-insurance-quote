import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { afterEach, describe, expect, test } from "vitest";
import { prepareWechatCards } from "../../scripts/wechat-card/prepare-batch";
import { decodeQrImage } from "../../scripts/wechat-card/image-processor";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function createWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), "wechat-card-batch-"));
  temporaryDirectories.push(workspace);
  const inputDir = join(workspace, "input");
  const outputDir = join(workspace, "output");
  await mkdir(inputDir, { recursive: true });
  return { inputDir, outputDir };
}

async function createWechatCard(payload: string) {
  const qr = await QRCode.toBuffer(payload, {
    type: "png",
    width: 360,
    margin: 4,
  });
  return sharp({
    create: {
      width: 820,
      height: 1219,
      channels: 4,
      background: "#FFFFFF",
    },
  })
    .composite([{ input: qr, left: 230, top: 420 }])
    .png()
    .toBuffer();
}

describe("prepareWechatCards", () => {
  test("processes every supported image and preserves the original card", async () => {
    const { inputDir, outputDir } = await createWorkspace();
    const source = await createWechatCard("contact:alice");
    await writeFile(join(inputDir, "alice.png"), source);
    await writeFile(join(inputDir, "notes.txt"), "not an image");

    const results = await prepareWechatCards({ inputDir, outputDir });
    const copiedCard = await readFile(join(outputDir, "alice", "wechat-card.png"));
    const croppedQr = await readFile(join(outputDir, "alice", "wechat-qr.png"));

    expect(results).toEqual([
      { name: "alice", method: "detected", source: "alice.png" },
    ]);
    expect(copiedCard).toEqual(source);
    expect((await decodeQrImage(croppedQr))?.data).toBe("contact:alice");
  });

  test("rejects an empty input directory", async () => {
    const { inputDir, outputDir } = await createWorkspace();

    await expect(prepareWechatCards({ inputDir, outputDir })).rejects.toThrow(
      "未在输入目录中找到名片图片",
    );
  });
});
