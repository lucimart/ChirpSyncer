const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (message && message.includes('punycode')) {
    return;
  }
  return originalEmitWarning(warning as string, ...(args as []));
}) as typeof process.emitWarning;

// Mock ResizeObserver for cmdk and other components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView for cmdk
Element.prototype.scrollIntoView = jest.fn();
