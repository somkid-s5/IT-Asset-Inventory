import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const localChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig(base, {
  use: localChromiumPath
    ? { launchOptions: { executablePath: localChromiumPath } }
    : {},
});
