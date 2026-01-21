const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (message && message.includes('punycode')) {
    return;
  }
  return originalEmitWarning(warning as string, ...(args as []));
}) as typeof process.emitWarning;
