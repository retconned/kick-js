export function createMessageHandler() {
  function onMessage(callback: (message: string) => void) {}

  return { onMessage };
}
