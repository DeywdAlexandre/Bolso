import { useCallback, useEffect, useState } from "react";

import { getInstallState, promptInstall, subscribeInstall, type InstallState } from "@/lib/install";

export function useInstall() {
  const [state, setState] = useState<InstallState>(() => getInstallState());

  useEffect(() => {
    setState(getInstallState());
    return subscribeInstall(() => setState(getInstallState()));
  }, []);

  const install = useCallback(async () => {
    const result = await promptInstall();
    setState(getInstallState());
    return result;
  }, []);

  return { state, install, canInstall: state === "prompt" || state === "ios" || state === "manual" };
}
