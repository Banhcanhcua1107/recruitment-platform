const { chromium } = require("playwright");
const fs = require("fs");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TARGET_EDIT_URL =
    process.env.TARGET_CV_EDIT_URL ||
    "http://localhost:3000/candidate/cv-builder/9c92e112-40da-44eb-84d3-cc9488236348/edit";
const CANDIDATE_EMAIL = process.env.CV_TEST_EMAIL || "candidate01@gmail.test";
const CANDIDATE_PASSWORD = process.env.CV_TEST_PASSWORD || "TalentFlowTest#2026";

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function stripSelectPrefix(label) {
    return String(label || "").replace(/^chon muc\s+/i, "").replace(/^chọn mục\s+/i, "").trim();
}

async function tryLogin(page) {
    await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
    });

    await page.fill("#email", CANDIDATE_EMAIL);
    await page.fill("#password", CANDIDATE_PASSWORD);

    const submitByText = page.locator('form button:has-text("Đăng nhập ngay")');
    if (await submitByText.count()) {
        await submitByText.first().click();
    } else {
        await page.locator("form button").last().click();
    }

    await page.waitForTimeout(2200);
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    return !/\/login($|\?)/i.test(page.url());
}

async function syncFakeAccounts(page) {
    const response = await page.request.post(`${BASE_URL}/api/fake-accounts/sync-recruitment`, {
        data: {},
        timeout: 120000,
    });

    if (!response.ok()) {
        const body = await response.text();
        throw new Error(`Failed to sync fake accounts: ${response.status()} ${body}`);
    }
}

async function ensureLoggedIn(page) {
    let loggedIn = await tryLogin(page);
    if (loggedIn) {
        return;
    }

    await syncFakeAccounts(page);
    loggedIn = await tryLogin(page);

    if (!loggedIn) {
        throw new Error("Unable to login with configured candidate account.");
    }
}

async function resolveEditableRoute(page, report) {
    await page.goto(TARGET_EDIT_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
    });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText();
    const normalizedBody = normalizeText(bodyText);
    const blocked =
        normalizedBody.includes("khong tim thay cv") ||
        normalizedBody.includes("khong co quyen truy cap");

    report.providedTarget = {
        url: TARGET_EDIT_URL,
        finalUrl: page.url(),
        accessible: !blocked,
        blocked,
    };

    if (!blocked) {
        return page.url();
    }

    await page.goto(`${BASE_URL}/candidate/cv-builder/new`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
    });
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});

    const templateCards = page.locator("div.cursor-pointer");
    await templateCards.first().waitFor({ state: "visible", timeout: 120000 });
    await templateCards.first().click();

    const useTemplateButton = page.locator("div.bg-white.border-b button").first();
    await useTemplateButton.waitFor({ state: "visible", timeout: 30000 });
    await useTemplateButton.click();

    await page.waitForURL(/\/candidate\/cv-builder\/[^/]+\/edit/, {
        timeout: 120000,
    });
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});

    return page.url();
}

async function readPaneScrollState(page) {
    return page.evaluate(() => {
        const preview = document.querySelector("[data-editor-preview-scroll='true']");
        const right = document.querySelector("[data-editor-right-scroll='true']");

        return {
            preview: preview ?
                {
                    top: preview.scrollTop,
                    height: preview.scrollHeight,
                    client: preview.clientHeight,
                } :
                null,
            right: right ?
                {
                    top: right.scrollTop,
                    height: right.scrollHeight,
                    client: right.clientHeight,
                } :
                null,
        };
    });
}

async function setPreviewScrollToBottom(page) {
    await page.evaluate(() => {
        const preview = document.querySelector("[data-editor-preview-scroll='true']");
        if (preview) {
            preview.scrollTop = preview.scrollHeight;
        }
    });
}

async function setRightScrollToBottom(page) {
    await page.evaluate(() => {
        const right = document.querySelector("[data-editor-right-scroll='true']");
        if (right) {
            right.scrollTop = right.scrollHeight;
        }
    });
}

async function setPreviewScrollToTop(page) {
    await page.evaluate(() => {
        const preview = document.querySelector("[data-editor-preview-scroll='true']");
        if (preview) {
            preview.scrollTop = 0;
        }
    });
}

async function setRightScrollToTop(page) {
    await page.evaluate(() => {
        const right = document.querySelector("[data-editor-right-scroll='true']");
        if (right) {
            right.scrollTop = 0;
        }
    });
}

async function readRightPanelState(page) {
    return page.evaluate(() => {
        const aside = document.querySelector("[data-editor-pane='right']");
        const rightScroll = document.querySelector("[data-editor-right-scroll='true']");

        const outlineButtons = Array.from(
            document.querySelectorAll("[data-editor-pane='right'] button")
        );

        const activeOutlineButton = outlineButtons.find((button) => {
            const className = button.className || "";
            return (
                className.includes("bg-sky-50") &&
                className.includes("text-primary") &&
                (button.textContent || "").trim().length > 0
            );
        });

        const firstField = aside ?
            aside.querySelector("input, textarea") :
            null;

        const fieldLabel = firstField ?
            (firstField.closest("label") ? .querySelector("span") ? .textContent || "").trim() :
            "";

        const fieldPlaceholder = firstField ?
            firstField.getAttribute("placeholder") || "" :
            "";

        const activeElement = document.activeElement;

        return {
            scrollTop: rightScroll ? rightScroll.scrollTop : null,
            activeOutlineText: activeOutlineButton ?
                (activeOutlineButton.textContent || "").trim() :
                null,
            fieldLabel,
            fieldPlaceholder,
            focusedInsideRightPane: !!(
                aside &&
                activeElement &&
                aside.contains(activeElement)
            ),
            focusedTagName: activeElement ? activeElement.tagName : null,
        };
    });
}

function findFirstMatchingSection(sections, patterns, used) {
    for (const section of sections) {
        if (used.has(section.index)) {
            continue;
        }

        if (patterns.some((pattern) => section.norm.includes(pattern))) {
            used.add(section.index);
            return section;
        }
    }

    return null;
}

(async() => {
    const report = {
        baseUrl: BASE_URL,
        runtimeEditUrl: null,
        providedTarget: null,
        leftRightIndependentScroll: {
            previewCanScroll: false,
            rightCanScroll: false,
            previewScrollDoesNotMoveRight: false,
            rightScrollDoesNotMovePreview: false,
        },
        selectedSyncChecks: [],
        rapidSwitch: null,
        screenshotPath: null,
    };

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1680, height: 1200 } });

    try {
        await ensureLoggedIn(page);

        const runtimeEditUrl = await resolveEditableRoute(page, report);
        report.runtimeEditUrl = runtimeEditUrl;

        await page.waitForSelector("[data-editor-preview-scroll='true']", {
            timeout: 120000,
        });
        await page.waitForSelector("[data-editor-right-scroll='true']", {
            timeout: 120000,
        });

        const selectableLocator = page.locator("[data-cv-editor-selectable='true']");
        await selectableLocator.first().waitFor({ state: "visible", timeout: 60000 });

        const selectableCount = await selectableLocator.count();
        const selectableSections = [];

        for (let index = 0; index < selectableCount; index += 1) {
            const ariaLabel = await selectableLocator.nth(index).getAttribute("aria-label");
            if (!ariaLabel) {
                continue;
            }

            const plain = stripSelectPrefix(ariaLabel);
            selectableSections.push({
                index,
                label: plain,
                norm: normalizeText(plain),
            });
        }

        const usedIndices = new Set();
        const picked = [{
                type: "overview",
                section: findFirstMatchingSection(selectableSections, ["tong quan", "overview"], usedIndices),
            },
            {
                type: "skills",
                section: findFirstMatchingSection(selectableSections, ["ky nang", "skill"], usedIndices),
            },
            {
                type: "experience",
                section: findFirstMatchingSection(selectableSections, ["kinh nghiem", "experience"], usedIndices),
            },
            {
                type: "projects",
                section: findFirstMatchingSection(selectableSections, ["du an", "project"], usedIndices),
            },
        ].filter((entry) => Boolean(entry.section));

        // Scroll isolation checks.
        await setPreviewScrollToTop(page);
        await setRightScrollToTop(page);
        await page.waitForTimeout(80);

        const beforePreviewScroll = await readPaneScrollState(page);
        await setPreviewScrollToBottom(page);
        await page.waitForTimeout(120);
        const afterPreviewScroll = await readPaneScrollState(page);

        const previewDelta =
            (afterPreviewScroll.preview ? .top || 0) - (beforePreviewScroll.preview ? .top || 0);
        const rightDeltaFromPreview = Math.abs(
            (afterPreviewScroll.right ? .top || 0) - (beforePreviewScroll.right ? .top || 0)
        );

        report.leftRightIndependentScroll.previewCanScroll = previewDelta > 12;
        report.leftRightIndependentScroll.previewScrollDoesNotMoveRight = rightDeltaFromPreview <= 2;

        await setPreviewScrollToTop(page);
        await setRightScrollToTop(page);
        await page.waitForTimeout(80);

        const beforeRightScroll = await readPaneScrollState(page);
        await setRightScrollToBottom(page);
        await page.waitForTimeout(120);
        const afterRightScroll = await readPaneScrollState(page);

        const rightDelta =
            (afterRightScroll.right ? .top || 0) - (beforeRightScroll.right ? .top || 0);
        const previewDeltaFromRight = Math.abs(
            (afterRightScroll.preview ? .top || 0) - (beforeRightScroll.preview ? .top || 0)
        );

        report.leftRightIndependentScroll.rightCanScroll = rightDelta > 12;
        report.leftRightIndependentScroll.rightScrollDoesNotMovePreview = previewDeltaFromRight <= 2;

        let previousSignature = null;

        for (const target of picked) {
            const section = target.section;
            if (!section) {
                continue;
            }

            await setRightScrollToBottom(page);
            await page.waitForTimeout(60);

            await selectableLocator.nth(section.index).click();
            await page.waitForTimeout(180);

            const panelState = await readRightPanelState(page);

            const expectedNorm = normalizeText(section.label);
            const outlineNorm = normalizeText(panelState.activeOutlineText || "");
            const outlineSynced =
                outlineNorm.includes(expectedNorm) || expectedNorm.includes(outlineNorm);
            const jumpedTop = typeof panelState.scrollTop === "number" ? panelState.scrollTop <= 4 : false;
            const focusedField =
                panelState.focusedInsideRightPane &&
                (panelState.focusedTagName === "INPUT" || panelState.focusedTagName === "TEXTAREA");

            const signature = `${normalizeText(panelState.fieldLabel)}|${normalizeText(
        panelState.fieldPlaceholder
      )}`;
            const signatureChanged = previousSignature === null ? true : signature !== previousSignature;

            report.selectedSyncChecks.push({
                type: target.type,
                clickedLabel: section.label,
                outlineText: panelState.activeOutlineText,
                outlineSynced,
                jumpedTop,
                focusedField,
                fieldLabel: panelState.fieldLabel,
                fieldPlaceholder: panelState.fieldPlaceholder,
                signatureChanged,
            });

            previousSignature = signature;
        }

        if (picked.length >= 3) {
            const rapidSequence = [picked[0], picked[1], picked[2], picked[1], picked[0], picked[2]];

            for (const target of rapidSequence) {
                await selectableLocator.nth(target.section.index).click();
                await page.waitForTimeout(24);
            }

            await page.waitForTimeout(220);
            const panelState = await readRightPanelState(page);
            const expected = rapidSequence[rapidSequence.length - 1].section;
            const expectedNorm = normalizeText(expected.label);
            const outlineNorm = normalizeText(panelState.activeOutlineText || "");

            report.rapidSwitch = {
                expectedLabel: expected.label,
                outlineText: panelState.activeOutlineText,
                outlineSynced: outlineNorm.includes(expectedNorm) || expectedNorm.includes(outlineNorm),
                jumpedTop: typeof panelState.scrollTop === "number" ? panelState.scrollTop <= 4 : false,
                focusedField: panelState.focusedInsideRightPane &&
                    (panelState.focusedTagName === "INPUT" || panelState.focusedTagName === "TEXTAREA"),
            };
        }

        fs.mkdirSync("artifacts/responsive-qa", { recursive: true });
        const screenshotPath = "artifacts/responsive-qa/cv-editor-layout-sync.png";
        const reportPath = "artifacts/responsive-qa/cv-editor-layout-sync.json";

        await page.screenshot({ path: screenshotPath, fullPage: true });
        report.screenshotPath = screenshotPath;

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        const selectionChecksPass = report.selectedSyncChecks.every(
            (entry) => entry.outlineSynced && entry.jumpedTop
        );
        const rapidSwitchPass =
            report.rapidSwitch === null ||
            (report.rapidSwitch.outlineSynced && report.rapidSwitch.jumpedTop);

        const independentScrollPass =
            report.leftRightIndependentScroll.previewCanScroll &&
            report.leftRightIndependentScroll.rightCanScroll &&
            report.leftRightIndependentScroll.previewScrollDoesNotMoveRight &&
            report.leftRightIndependentScroll.rightScrollDoesNotMovePreview;

        const pass = independentScrollPass && selectionChecksPass && rapidSwitchPass;

        console.log(
            JSON.stringify({
                    pass,
                    reportPath,
                    screenshotPath,
                    runtimeEditUrl,
                    independentScrollPass,
                    selectionChecksPass,
                    rapidSwitchPass,
                },
                null,
                2
            )
        );

        if (!pass) {
            process.exitCode = 1;
        }
    } catch (error) {
        console.error(String(error));
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();