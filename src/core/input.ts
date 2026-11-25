import type { Vec2 } from './math';

export interface Input {
  isDown: (code: string) => boolean;
  mouse: Readonly<Vec2>;
  mouseDown: () => boolean;
}

/** Tracks keyboard state (by KeyboardEvent.code) and mouse position in canvas pixels. */
export function createInput(canvas: HTMLCanvasElement): Input {
  const keys = new Set<string>();
  const mouse: Vec2 = { x: canvas.width / 2, y: canvas.height / 2 };
  let buttonDown = false;

  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    buttonDown = false;
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', () => (buttonDown = true));
  window.addEventListener('mouseup', () => (buttonDown = false));

  return {
    isDown: (code) => keys.has(code),
    mouse,
    mouseDown: () => buttonDown,
  };
}
