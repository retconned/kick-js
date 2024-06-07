import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { commandPrefix } from "../handlers/onMessage";
import { KickChannelInfo } from "../types/channels";

export const runtimeChannelData = new Map<number, string>();

export const getChannelData = async (channel: string) => {
  const puppeteerExtra = puppeteer.use(StealthPlugin()) as typeof puppeteer;
  const browser = await puppeteerExtra.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(`https://kick.com/api/v2/channels/${channel}`);
  await page.waitForSelector("body");
  try {
    const jsonContent: KickChannelInfo = await page.evaluate(() => {
      const bodyElement = document.querySelector("body");
      const bodyText = bodyElement ? bodyElement.textContent : null;
      return bodyText ? JSON.parse(bodyText) : null;
    });
    await browser.close();
    runtimeChannelData.set(jsonContent.chatroom.id, jsonContent.slug);
    return jsonContent;
  } catch (err: any) {
    throw err;
  }
};

export const getChatroomId = async (channels: string[]) => {
  let chatroomIds: number[] = [];
  for (const channel of channels) {
    const channelData = await getChannelData(channel);
    const chatRoomId = channelData.chatroom.id;
    chatroomIds.push(chatRoomId);
  }
  return chatroomIds;
};

export const getChannelIdRealtime = (
  map: Map<number, string>,
  channelName: string
): number | undefined => {
  for (let [key, val] of map.entries()) {
    if (val === channelName) {
      return key;
    }
  }
  return undefined;
};

export const isCommand = (message: string) => {
  if (message && message.startsWith(commandPrefix)) {
    return true;
  }
  return false;
};
