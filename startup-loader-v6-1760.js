window.__pocketStartupTrace = window.__pocketStartupTrace || [];
window.__pocketStartupIssues = window.__pocketStartupIssues || [];

const RUNTIME_CDN =
  "https://cdn.jsdelivr.net/gh/aheidashuaige-coder/pocket-mappori-runtime@v1.7.6.0/";

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
    message: error instanceof Error ? error.message : undefined,
    stack: error instanceof Error ? error.stack?.slice(0, 5000) : undefined,
  });
}

beginStage("resources");

async function importApplication() {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), 6000);
  });
  const remote = import(`${RUNTIME_CDN}application-BMMUDZNB-1760.js`).catch(
    () => null,
  );
  const module = await Promise.race([remote, timeout]);
  clearTimeout(timer);
  return module ?? import("./application-BMMUDZNB-1760.js");
}

function showError(label, error) {
  const status = document.getElementById("startup-phase");
  if (status) {
    status.dataset.error = error instanceof Error ? error.name : "Error";
    status.textContent = `${label}：${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

(async () => {
  try {
    const platformModule = await import("./platform-BDeA0pL1.js");
    if (platformModule.isAndroidNative()) {
      try {
        const runtimeModule = await import("./runtime-DpOt3z-7.js");
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
      await applicationModule.dO.mountApplication();
    } catch (error) {
      reportIssue(
        error instanceof Error && error.message === "SAVE_UNAVAILABLE"
          ? "SAVE_UNAVAILABLE"
          : "UI_INITIALIZATION",
        "application-mount",
        error,
      );
      showError("界面初始化失败", error);
    }
  } catch (error) {
    reportIssue(
      error instanceof Error && error.message === "SAVE_UNAVAILABLE"
        ? "SAVE_UNAVAILABLE"
        : "ENTRY_RESOURCE",
      "application",
      error,
    );
    showError("启动资源加载失败", error);
  }
})();
