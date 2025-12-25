import {
  mountGraphWorkbench,
  renderGraphWorkbench,
  unmountGraphWorkbench
} from './graph/workbench.js';
import { createTab } from './tabKit.js';

export function registerGraphTab(ctx) {
  return createTab(ctx, {
    name: 'graph',
    render: context => renderGraphWorkbench(context),
    setup: ({ ctx: context }) => {
      mountGraphWorkbench(context);
    },
    reset: ({ ctx: context }) => {
      unmountGraphWorkbench(context);
    }
  });
}
