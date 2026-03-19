import type {
  OpenDialogOptions,
  SaveDialogOptions,
} from "@tauri-apps/plugin-dialog";

type MockInvoke = <T = unknown>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;
type MockOpen = (
  options?: OpenDialogOptions,
) => Promise<string | string[] | null>;
type MockSave = (options?: SaveDialogOptions) => Promise<string | null>;

declare global {
  interface Window {
    __OFFLINE_BI_TEST_API__?: {
      invoke?: MockInvoke;
      open?: MockOpen;
      save?: MockSave;
    };
  }
}

function getTestApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__OFFLINE_BI_TEST_API__ ?? null;
}

export async function invokeCommand<TResult>(
  command: string,
  args?: Record<string, unknown>,
) {
  const testApi = getTestApi();
  if (testApi?.invoke) {
    return testApi.invoke<TResult>(command, args);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<TResult>(command, args);
}

export async function openDialog(options?: OpenDialogOptions) {
  const testApi = getTestApi();
  if (testApi?.open) {
    return testApi.open(options);
  }

  const { open } = await import("@tauri-apps/plugin-dialog");
  return open(options);
}

export async function saveDialog(options?: SaveDialogOptions) {
  const testApi = getTestApi();
  if (testApi?.save) {
    return testApi.save(options);
  }

  const { save } = await import("@tauri-apps/plugin-dialog");
  return save(options);
}
