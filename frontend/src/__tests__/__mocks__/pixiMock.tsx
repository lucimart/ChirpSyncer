// Mock pixi.js for Jest
export const Application = jest.fn().mockImplementation(() => ({
  init: jest.fn().mockResolvedValue(undefined),
  stage: { addChild: jest.fn(), removeChild: jest.fn() },
  ticker: { add: jest.fn(), remove: jest.fn() },
  renderer: { resize: jest.fn() },
  canvas: document.createElement('canvas'),
  destroy: jest.fn(),
  resize: jest.fn(),
}));

export const Container = jest.fn().mockImplementation(() => ({
  addChild: jest.fn(),
  removeChild: jest.fn(),
  children: [],
  destroy: jest.fn(),
}));

export const Graphics = jest.fn().mockImplementation(() => ({
  clear: jest.fn().mockReturnThis(),
  setFillStyle: jest.fn().mockReturnThis(),
  beginFill: jest.fn().mockReturnThis(),
  endFill: jest.fn().mockReturnThis(),
  circle: jest.fn().mockReturnThis(),
  fill: jest.fn().mockReturnThis(),
  rect: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  moveTo: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  setStrokeStyle: jest.fn().mockReturnThis(),
  destroy: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  position: { set: jest.fn() },
  x: 0,
  y: 0,
  alpha: 1,
  cursor: 'default',
  eventMode: 'none',
}));

export const Text = jest.fn().mockImplementation(() => ({
  text: '',
  style: {},
  position: { set: jest.fn() },
  anchor: { set: jest.fn() },
  x: 0,
  y: 0,
  alpha: 1,
  destroy: jest.fn(),
}));

export const TextStyle = jest.fn().mockImplementation((options) => options || {});

export class FederatedPointerEvent {
  type = 'pointerdown';
  global = { x: 0, y: 0 };
  target = null;
}
