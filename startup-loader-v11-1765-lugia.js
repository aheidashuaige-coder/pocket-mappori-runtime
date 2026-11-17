window.__pocketStartupTrace = window.__pocketStartupTrace || [];
window.__pocketStartupIssues = window.__pocketStartupIssues || [];

const APP_FILE = "application-uVaYIh_a-1765-lugia.js";
const HEALTH_FILE = "health-1765.json";
const COMMIT = "main";
const CDN_BASES = [
  `https://fastly.jsdelivr.net/gh/aheidashuaige-coder/pocket-mappori-runtime@${COMMIT}/`,
  `https://cdn.jsdelivr.net/gh/aheidashuaige-coder/pocket-mappori-runtime@${COMMIT}/`,
  `https://gcore.jsdelivr.net/gh/aheidashuaige-coder/pocket-mappori-runtime@${COMMIT}/`,
  `https://testingcf.jsdelivr.net/gh/aheidashuaige-coder/pocket-mappori-runtime@${COMMIT}/`,
  `https://cdn.statically.io/gh/aheidashuaige-coder/pocket-mappori-runtime/${COMMIT}/`,
];
const LOCAL_BASE = new URL("./", import.meta.url).href;

function beginStage(name) {
  window.__pocketStartupTrace.push({
    stage: name,
    started: Math.round(performance.now()),
    status: "active",
  });
}
function finishStage(name, status = "complete", code) {
  const stage = [...window.__pocketStartupTrace]
    .reverse()
    .find((item) => item.stage === name && item.status === "active");
  if (!stage) return;
  stage.ended = Math.round(performance.now());
  stage.status = status;
  if (code) stage.code = code;
}
function reportIssue(code, module, error) {
  window.__pocketStartupIssues.push({
    stage: "resources",
    module,
    code,
    errorType: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.slice(0, 8000) : undefined,
  });
}
function setPhase(text) {
  const element = document.getElementById("startup-phase");
  if (element) element.textContent = text;
}
async function probe(base) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  const started = performance.now();
  try {
    const response = await fetch(base + HEALTH_FILE, {
      cache: "no-store",
      mode: "cors",
      signal: controller.signal,
    });
    if (!response.ok) throw Error("HTTP " + response.status);
    const data = await response.json();
    if (data.entry !== APP_FILE) throw Error("版本不匹配");
    return { base, ms: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(timer);
  }
}
async function importFrom(base) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(Error("模块下载超时：" + base)),
      25000,
    );
  });
  try {
    return await Promise.race([import(base + APP_FILE), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
async function chooseSources() {
  setPhase("正在检测可用资源节点…");
  const results = await Promise.allSettled(
    CDN_BASES.map(async (base) => probe(base)),
  );
  const available = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") available.push(result.value);
    else reportIssue("CDN_PROBE", CDN_BASES[index], result.reason);
  });
  available.sort((a, b) => a.ms - b.ms);
  return [...available.map((item) => item.base), LOCAL_BASE];
}
async function importApplication() {
  const sources = await chooseSources();
  let lastError;
  for (const [index, base] of sources.entries()) {
    setPhase(index === sources.length - 1
      ? "正在加载本站备用资源…"
      : "正在从资源节点 " + (index + 1) + " 加载…");
    try {
      return await importFrom(base);
    } catch (error) {
      lastError = error;
      reportIssue("ENTRY_RESOURCE", base, error);
    }
  }
  throw lastError ?? Error("没有可用资源节点");
}
window.addEventListener("vite:preloadError", (event) => {
  const error = event.payload;
  try {
    localStorage.setItem(
      "pocket-mappori:last-module-error:v1",
      JSON.stringify({
        at: Date.now(),
        page: location.href,
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.slice(0, 8000) : undefined,
      }),
    );
  } catch {}
});

beginStage("resources");
(async () => {
  try {
    const platformModule = await import("./platform-BDeA0pL1.js");
    if (platformModule.isAndroidNative()) {
      try {
        const runtimeModule = await import("./runtime-BIwJRBO1.js");
        await runtimeModule.initializeNativeRuntime();
      } catch (error) {
        reportIssue("OPTIONAL_NATIVE", "native-runtime", error);
      }
    }
    const applicationModule = await importApplication();
    finishStage("resources");
    beginStage("save");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      await applicationModule.dL.mountApplication();
    } catch (error) {
      reportIssue(
        error instanceof Error && error.message === "SAVE_UNAVAILABLE"
          ? "SAVE_UNAVAILABLE"
          : "UI_INITIALIZATION",
        "application-mount",
        error,
      );
      setPhase("界面初始化失败：" + (error instanceof Error ? error.message : error));
    }
  } catch (error) {
    reportIssue(
      error instanceof Error && error.message === "SAVE_UNAVAILABLE"
        ? "SAVE_UNAVAILABLE"
        : "ENTRY_RESOURCE",
      "application",
      error,
    );
    setPhase("启动资源加载失败：" + (error instanceof Error ? error.message : error));
  }
})();
