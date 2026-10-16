// Coordinates are in the window, so both resize and keyboard overlay work.
export function renameScrollOffset(offset: number, fieldTop: number, fieldHeight: number, viewportTop: number, viewportHeight: number, keyboardTop: number) {
    const top = viewportTop + 12;
    const bottom = Math.min(viewportTop + viewportHeight, keyboardTop) - 12;
    if (bottom <= top) return offset;
    if (fieldTop < top) return Math.max(0, offset + fieldTop - top);
    if (fieldTop + fieldHeight > bottom) return Math.max(0, offset + Math.min(fieldTop - top, fieldTop + fieldHeight - bottom));
    return offset;
}
