import { test, expect, type Page } from "@playwright/test";

const TEST_EMAIL = "pw-e2e@test.com";
const TEST_PASS = "testpass123";

async function ensureRegistered(page: Page) {
  const res = await page.request.post("/api/v1/auth/register", {
    data: { email: TEST_EMAIL, password: TEST_PASS },
  });
  // 201 = new user, 409 = already exists — both OK
}

async function register(page: Page) {
  await page.goto("/register");
  await page.fill('input[type="email"]', `pw-${Date.now()}@test.com`);
  await page.fill('input[type="password"]', TEST_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("/login");
}

async function login(page: Page) {
  await ensureRegistered(page);
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("/notes", { timeout: 15000 });
}

test.describe("Auth", () => {
  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1")).toContainText("Create Account");
  });

  test("register new user", async ({ page }) => {
    await register(page);
    await expect(page).toHaveURL("/login");
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign In");
  });

  test("login with registered user", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL("/notes");
  });

  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/notes");
    await page.waitForURL(/login/);
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Notes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("notes page loads", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Notes");
  });

  test("create a new note", async ({ page }) => {
    await page.click("text=New Note");
    await page.waitForTimeout(500);
    await page.click("text=Blank note");
    await page.waitForURL(/\/notes\//);
    await expect(page.locator('input[placeholder="Untitled"]')).toBeVisible();
  });

  test("edit note title", async ({ page }) => {
    await page.click("text=New Note");
    await page.waitForTimeout(500);
    await page.click("text=Blank note");
    await page.waitForURL(/\/notes\//);

    const titleInput = page.locator('input[placeholder="Untitled"]');
    await titleInput.fill("Playwright Test Note");
    await titleInput.blur();
    await page.waitForTimeout(1000);

    await page.goto("/notes");
    await expect(page.locator("text=Playwright Test Note").first()).toBeVisible();
  });

  test("delete note shows confirm dialog", async ({ page }) => {
    await page.locator("text=Playwright Test Note").first().click();
    await page.waitForURL(/\/notes\//);
    await page.click("text=Delete");
    await expect(page.locator("text=Delete note")).toBeVisible();
    await expect(page.locator("text=Cancel")).toBeVisible();
  });

  test("sensitivity toggle works", async ({ page }) => {
    await page.locator("text=Playwright Test Note").first().click();
    await page.waitForURL(/\/notes\//);
    await expect(page.locator("text=Public")).toBeVisible();
    await page.click("text=Public");
    await expect(page.locator("text=Sensitive")).toBeVisible();
  });
});

test.describe("Journal", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/journal");
  });

  test("journal page loads", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Journal");
  });

  test("today button navigates to today's entry", async ({ page }) => {
    const today = new Date().toISOString().split("T")[0];
    await page.click("text=Today");
    await page.waitForURL(new RegExp(`/journal/${today}`));
    await expect(page.locator("h1")).toContainText(today);
  });

  test("mood picker is visible", async ({ page }) => {
    const today = new Date().toISOString().split("T")[0];
    await page.goto(`/journal/${today}`);
    await expect(page.locator("text=Mood:")).toBeVisible();
    await expect(page.locator("text=Energy:")).toBeVisible();
  });
});

test.describe("Search", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/search");
  });

  test("search page loads", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Search");
  });

  test("search input is visible", async ({ page }) => {
    await expect(page.locator('input[placeholder="Search your knowledge base..."]')).toBeVisible();
  });

  test("mode selector shows three options", async ({ page }) => {
    await expect(page.locator("text=Combined")).toBeVisible();
    await expect(page.locator("text=Fulltext")).toBeVisible();
    await expect(page.locator("text=Semantic")).toBeVisible();
  });
});

test.describe("AI Chat", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/ai");
  });

  test("AI chat page loads", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("AI Chat");
  });

  test("new chat button is visible", async ({ page }) => {
    await expect(page.locator("text=New Chat")).toBeVisible();
  });

  test("suggestion chips are visible", async ({ page }) => {
    await expect(page.locator("text=What did I write about recently?")).toBeVisible();
  });

  test("chat input is visible", async ({ page }) => {
    await expect(page.locator('input[placeholder="Ask your second brain..."]')).toBeVisible();
  });
});

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/settings");
  });

  test("settings page loads", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Settings");
  });

  test("tag creation form is visible", async ({ page }) => {
    await expect(page.locator('input[placeholder="New tag name"]')).toBeVisible();
    await expect(page.locator("text=Add")).toBeVisible();
  });
});

test.describe("Trash", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/trash");
  });

  test("trash page loads", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Trash");
  });
});

test.describe("Import", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/import");
  });

  test("import page loads", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Import Notes");
  });

  test("drag and drop area is visible", async ({ page }) => {
    await expect(page.locator("text=Drag and drop files here")).toBeVisible();
    await expect(page.locator("text=Browse Files")).toBeVisible();
  });
});

test.describe("404", () => {
  test("styled 404 page", async ({ page }) => {
    await page.goto("/nonexistent-page");
    await expect(page.locator("text=Page Not Found")).toBeVisible();
    await expect(page.locator("text=Go Home")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.locator("aside a", { hasText: "Journal" }).click();
    await page.waitForURL(/journal/, { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("Journal");

    await page.locator("aside a", { hasText: "Search" }).click();
    await page.waitForURL(/search/, { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("Search");
  });

  test("search bar in sidebar is clickable", async ({ page }) => {
    const searchBtn = page.locator("aside button", { hasText: "Search..." });
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    await expect(page.locator('input[placeholder*="Search or type"]')).toBeVisible({ timeout: 5000 });
  });
});
