import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { KickChannelInfo } from "../types/channels";
import type { VideoInfo } from "../types/video";

export const getChannelData = async (
  channel: string,
): Promise<KickChannelInfo | null> => {
  const puppeteerExtra = puppeteer.use(StealthPlugin());
  const browser = await puppeteerExtra.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`https://kick.com/api/v2/channels/${channel}`);
  await page.waitForSelector("body");

  try {
    const jsonContent: KickChannelInfo = await page.evaluate(() => {
      const bodyElement = document.querySelector("body");
      if (!bodyElement || !bodyElement.textContent) {
        throw new Error("Unable to fetch channel data");
      }

      console.log(bodyElement.textContent);
      return JSON.parse(bodyElement.textContent);
    });

    console.log(JSON.stringify(jsonContent));
    await browser.close();
    return jsonContent;
  } catch (error) {
    await browser.close();
    console.error("Error getting channel data:", error);
    return null;
  }
};

export const getVideoData = async (
  video_id: string,
): Promise<VideoInfo | null> => {
  const puppeteerExtra = puppeteer.use(StealthPlugin());
  const browser = await puppeteerExtra.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`https://kick.com/api/v1/video/${video_id}`);
  await page.waitForSelector("body");

  try {
    const jsonContent: VideoInfo = await page.evaluate(() => {
      const bodyElement = document.querySelector("body");
      if (!bodyElement || !bodyElement.textContent) {
        throw new Error("Unable to fetch video data");
      }

      console.log(bodyElement.textContent);
      return JSON.parse(bodyElement.textContent);
    });

    await browser.close();
    return jsonContent;
  } catch (error) {
    await browser.close();
    console.error("Error getting video data:", error);
    return null;
  }
};
