import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { KickChannelInfo } from "../types/channels";
import type { VideoInfo } from "../types/video";
import { authenticator } from "otplib";
import type { AuthenticationSettings } from "../types/client";

const setupPuppeteer = async () => {
  const puppeteerExtra = puppeteer.use(StealthPlugin());
  const browser = await puppeteerExtra.launch({
    headless: true,
    defaultViewport: null,
    args: ["--start-maximized"],
  });
  const page = await browser.newPage();
  return { browser, page };
};

export const getChannelData = async (
  channel: string,
): Promise<KickChannelInfo | null> => {
  const { browser, page } = await setupPuppeteer();

  try {
    const response = await page.goto(
      `https://kick.com/api/v2/channels/${channel}`,
    );

    if (response?.status() === 403) {
      throw new Error(
        "Request blocked by Cloudflare protection. Please try again later.",
      );
    }

    await page.waitForSelector("body");

    const jsonContent: KickChannelInfo = await page.evaluate(() => {
      const bodyElement = document.querySelector("body");
      if (!bodyElement || !bodyElement.textContent) {
        throw new Error("Unable to fetch channel data");
      }
      return JSON.parse(bodyElement.textContent);
    });

    return jsonContent;
  } catch (error) {
    console.error("Error getting channel data:", error);
    return null;
  } finally {
    await browser.close();
  }
};

export const getVideoData = async (
  video_id: string,
): Promise<VideoInfo | null> => {
  const { browser, page } = await setupPuppeteer();

  try {
    const response = await page.goto(
      `https://kick.com/api/v1/video/${video_id}`,
    );

    if (response?.status() === 403) {
      throw new Error(
        "Request blocked by Cloudflare protection. Please try again later.",
      );
    }

    await page.waitForSelector("body");

    const jsonContent: VideoInfo = await page.evaluate(() => {
      const bodyElement = document.querySelector("body");
      if (!bodyElement || !bodyElement.textContent) {
        throw new Error("Unable to fetch video data");
      }
      return JSON.parse(bodyElement.textContent);
    });

    return jsonContent;
  } catch (error) {
    console.error("Error getting video data:", error);
    return null;
  } finally {
    await browser.close();
  }
};

export const authentication = async ({
  username,
  password,
  otp_secret,
}: AuthenticationSettings): Promise<{
  bearerToken: string;
  xsrfToken: string;
  cookies: string;
  isAuthenticated: boolean;
}> => {
  let bearerToken = "";
  let xsrfToken = "";
  let cookieString = "";
  let isAuthenticated = false;

  const puppeteerExtra = puppeteer.use(StealthPlugin());
  const browser = await puppeteerExtra.launch({
    headless: true,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  let requestData: any[] = [];

  // Enable request interception
  await page.setRequestInterception(true);

  // Monitor all requests
  page.on("request", (request) => {
    const url = request.url();
    const headers = request.headers();

    if (url.includes("/api/v2/channels/followed")) {
      const reqBearerToken = headers["authorization"] || "";
      cookieString = headers["cookie"] || "";

      if (!bearerToken && reqBearerToken.includes("Bearer ")) {
        const splitToken = reqBearerToken.split("Bearer ")[1];
        if (splitToken) {
          bearerToken = splitToken;
        }
      }
    }

    requestData.push({
      url,
      headers,
      method: request.method(),
      resourceType: request.resourceType(),
    });

    request.continue();
  });

  const selectorTimeout = 6000;
  try {
    await page.goto("https://kick.com/");
    await page.waitForSelector("nav > div:nth-child(3) > button:first-child", {
      visible: true,
      timeout: selectorTimeout,
    });
    await page.click("nav > div:nth-child(3) > button:first-child");

    await page.waitForSelector('input[name="emailOrUsername"]', {
      visible: true,
      timeout: selectorTimeout,
    });

    await page.type('input[name="emailOrUsername"]', username, { delay: 100 });
    await page.type('input[name="password"]', password, { delay: 100 });
    await page.click('button[data-test="login-submit"]');

    try {
      await page.waitForFunction(
        () => {
          const element = document.querySelector(
            'input[data-input-otp="true"]',
          );
          const verifyText =
            document.body.textContent?.includes("Verify 2FA Code");
          return element || !verifyText;
        },
        { timeout: selectorTimeout },
      );

      const requires2FA = await page.evaluate(() => {
        return !!document.querySelector('input[data-input-otp="true"]');
      });

      if (requires2FA) {
        if (!otp_secret) {
          throw new Error("2FA authentication required");
        }

        const token = authenticator.generate(otp_secret);
        await page.waitForSelector('input[data-input-otp="true"]');
        await page.type('input[data-input-otp="true"]', token, { delay: 100 });
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: "networkidle0" });
      }
    } catch (error: any) {
      if (error.message.includes("2FA authentication required")) throw error;
    }

    await page.goto("https://kick.com/api/v2/channels/followed");

    const cookies = await page.cookies();
    cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const xsrfTokenCookie = cookies.find(
      (cookie) => cookie.name === "XSRF-TOKEN",
    )?.value;
    if (xsrfTokenCookie) {
      xsrfToken = xsrfTokenCookie;
    }

    if (!cookieString || cookieString === "") {
      throw new Error("Failed to capture cookies");
    }
    if (!bearerToken || bearerToken === "") {
      throw new Error("Failed to capture bearer token");
    }
    if (!xsrfToken || xsrfToken === "") {
      throw new Error("Failed to capture xsrf token");
    }

    isAuthenticated = true;

    return {
      bearerToken,
      xsrfToken,
      cookies: cookieString,
      isAuthenticated,
    };
  } catch (error: any) {
    throw error;
  } finally {
    await browser.close();
  }
};
