export type TilePosition = { x: number; y: number; width: number; height: number };
export function tilePositions(ids: readonly string[], width: number, columns: number, heights: Record<string, number>, fallback: number): { positions: Record<string, TilePosition>; height: number } {
    const gap = 12;
    const cellWidth = Math.max(0, (width - gap * (columns - 1)) / columns);
    const positions: Record<string, TilePosition> = {};
    let y = 0;
    for (let row = 0; row < ids.length; row += columns) {
        const rowIds = ids.slice(row, row + columns);
        const height = Math.max(...rowIds.map(id => heights[id] ?? fallback));
        rowIds.forEach((id, column) => { positions[id] = { x: column * (cellWidth + gap), y, width: cellWidth, height: heights[id] ?? fallback }; });
        y += height + gap;
    }
    return { positions, height: y };
}
export function nearestTile(ids: readonly string[], positions: Record<string, TilePosition>, x: number, y: number): number {
    let nearest = 0, distance = Infinity;
    ids.forEach((id, index) => {
        const p = positions[id];
        const next = (x - p.x - p.width / 2) ** 2 + (y - p.y - p.height / 2) ** 2;
        if (next < distance) { distance = next; nearest = index; }
    });
    return nearest;
}
// Невидимі через недоступні метадані ID зберігають свої місця.
export function mergeVisibleOrder(all: readonly string[], visible: readonly string[]): string[] {
    const moving = new Set(visible);
    let index = 0;
    return all.map(id => moving.has(id) ? visible[index++] : id);
}

// Pixels per frame: approach the edge gradually; cap long JS stalls to avoid jumps.
export function edgeScrollStep(screenY: number, top: number, height: number, elapsedMs: number): number {
    const zone = Math.min(64, height / 2);
    if (zone <= 0) return 0;
    const up = Math.max(0, Math.min(1, (top + zone - screenY) / zone));
    const down = Math.max(0, Math.min(1, (screenY - (top + height - zone)) / zone));
    return (down - up) * 360 * Math.max(0, Math.min(32, elapsedMs)) / 1000;
}
