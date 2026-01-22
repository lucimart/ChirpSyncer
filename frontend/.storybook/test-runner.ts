import type { TestRunnerConfig } from '@storybook/test-runner';
import { AxeBuilder } from '@axe-core/playwright';

const config: TestRunnerConfig = {
  async postRender(page) {
    const results = await new AxeBuilder({ page })
      .include('#root')
      .analyze();

    if (results.violations.length > 0) {
      const formatted = results.violations
        .map((violation) => `${violation.id}: ${violation.nodes.length} issue(s)`)
        .join('\n');
      throw new Error(`A11y violations detected:\n${formatted}`);
    }
  },
};

export default config;
