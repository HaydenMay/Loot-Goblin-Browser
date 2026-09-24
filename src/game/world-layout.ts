export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldLayout {
  goblin: WorldPoint;
  slime: WorldPoint;
}

export function getWorldLayout(width: number, height: number): WorldLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const insetX = safeWidth * 0.06;
  const insetY = safeHeight * 0.06;
  const place = (x: number, y: number): WorldPoint => ({
    x: Math.min(Math.max(x * safeWidth, insetX), safeWidth - insetX),
    y: Math.min(Math.max(y * safeHeight, insetY), safeHeight - insetY),
  });

  return {
    goblin: place(0.46, 0.62),
    slime: place(0.68, 0.4),
  };
}
