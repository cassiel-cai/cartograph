let switching = false;
let serverOrgId = "";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function beginOrgSwitch() {
  if (switching) {
    return;
  }

  switching = true;
  emit();
}

export function registerServerOrg(id: string) {
  const previous = serverOrgId;
  serverOrgId = id;

  if (switching && previous !== "" && id !== previous) {
    switching = false;
    emit();
  }
}

export function subscribeOrgSwitch(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOrgSwitching() {
  return switching;
}
