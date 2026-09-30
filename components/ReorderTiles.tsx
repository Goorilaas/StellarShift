import * as Haptics from 'expo-haptics';
import { ReactNode, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { moveItem } from '../services/collectionOrder';
import { edgeScrollStep, nearestTile, tilePositions, TilePosition } from '../services/tileOrder';

type Drag = { id: string; ids: string[]; positions: Record<string, TilePosition>; from: number; target: number; offset: number; dx: number; dy: number; screenY: number };
type Props = {
    ids: string[]; columns?: number; fallbackHeight: number; editing: boolean; saving: boolean;
    header?: ReactNode; onReorder: (ids: string[]) => void; onDragging: (active: boolean) => void;
    renderItem: (id: string, visible: boolean) => ReactNode;
};
export default function ReorderTiles({ ids, columns = 1, fallbackHeight, editing, saving, header, onReorder, onDragging, renderItem }: Props) {
    const [width, setWidth] = useState(0);
    const [heights, setHeights] = useState<Record<string, number>>({});
    const [headerHeight, setHeaderHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [active, setActive] = useState<string | null>(null);
    const viewport = useRef<View>(null);
    const scroll = useRef<ScrollView>(null);
    const top = useRef(0);
    const offset = useRef(0);
    const drag = useRef<Drag | null>(null);
    const frame = useRef<number | null>(null);
    const requestedOffset = useRef(0);
    const releasePosition = useRef({ x: 0, y: 0 });
    const scrollOffset = useRef(new Animated.Value(0)).current;
    const movement = useRef(new Animated.ValueXY()).current;
    const native = useMemo(() => Gesture.Native(), []);
    const layout = tilePositions(ids, width, columns, heights, fallbackHeight);
    const current = useRef({ ids, layout, editing, saving, onReorder, onDragging, headerHeight, viewportHeight });
    current.current = { ids, layout, editing, saving, onReorder, onDragging, headerHeight, viewportHeight };
    const stopScroll = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
    useEffect(() => () => stopScroll(), []);
    useEffect(() => {
        if (!editing || saving) { stopScroll(); drag.current = null; setActive(null); }
    }, [editing, saving]);

    const updateTarget = () => {
        const d = drag.current;
        if (!d || !current.current.editing) return;
        const start = d.positions[d.id];
        const x = start.x + d.dx;
        const y = start.y + d.dy + offset.current - d.offset;
        releasePosition.current = { x, y };
        const target = nearestTile(d.ids, d.positions, x + start.width / 2, y + start.height / 2);
        if (target !== d.target) {
            d.target = target;
            current.current.onReorder(moveItem(d.ids, d.from, target));
        }
    };
    const begin = (id: string, screenY: number) => {
        const c = current.current;
        if (!c.editing || c.saving || drag.current) return;
        const p = c.layout.positions[id];
        drag.current = { id, ids: [...c.ids], positions: c.layout.positions, from: c.ids.indexOf(id), target: c.ids.indexOf(id), offset: offset.current, dx: 0, dy: 0, screenY };
        // The dragged tile stays under the finger while native scrolling moves its parent.
        movement.setValue({ x: p.x, y: p.y - offset.current });
        releasePosition.current = { x: p.x, y: p.y };
        requestedOffset.current = offset.current;
        setActive(id); c.onDragging(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        let previousTime: number | null = null;
        const tick = (time: number) => {
            const d = drag.current, latest = current.current;
            if (!d) return;
            const elapsed = previousTime === null ? 0 : time - previousTime;
            previousTime = time;
            const step = edgeScrollStep(d.screenY, top.current, latest.viewportHeight, elapsed);
            const max = Math.max(0, latest.headerHeight + latest.layout.height + 24 - latest.viewportHeight);
            const next = Math.max(0, Math.min(max, requestedOffset.current + step));
            if (next !== requestedOffset.current) {
                requestedOffset.current = next;
                scroll.current?.scrollTo({ y: next, animated: false });
            }
            frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
    };
    const finish = (id: string, success: boolean) => {
        const d = drag.current;
        if (!d || d.id !== id) return;
        stopScroll();
        updateTarget();
        setScrollY(offset.current);
        if (!success && current.current.editing) current.current.onReorder(d.ids);
        drag.current = null;
        setActive(null); current.current.onDragging(false);
    };
    return <View ref={viewport} style={styles.viewport} onLayout={e => {
        setViewportHeight(e.nativeEvent.layout.height);
        viewport.current?.measureInWindow((_x, y) => { top.current = y; });
    }}>
        <GestureDetector gesture={native}>
            <Animated.ScrollView ref={scroll} scrollEnabled={!active && !saving} removeClippedSubviews={false}
                contentContainerStyle={styles.content} scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollOffset } } }], {
                    useNativeDriver: true,
                    listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
                        offset.current = e.nativeEvent.contentOffset.y;
                        if (drag.current) updateTarget();
                        else setScrollY(offset.current);
                    },
                })}>
                <View onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>{header}</View>
                <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: layout.height }}>
                    {width > 0 && ids.map(id => {
                        const position = layout.positions[id];
                        const visible = position.y + headerHeight < scrollY + viewportHeight && position.y + headerHeight + position.height > scrollY;
                        return <MovingTile key={id} position={position} editing={editing} saving={saving} active={id === active}
                            movement={movement} scrollOffset={scrollOffset} releasePosition={releasePosition} native={native}
                            onHeight={height => setHeights(old => old[id] === height ? old : { ...old, [id]: height })}
                            onBegin={y => begin(id, y)} onMove={(dx, dy, y) => {
                                const d = drag.current;
                                if (d?.id === id) {
                                    Object.assign(d, { dx, dy, screenY: y });
                                    const start = d.positions[id];
                                    movement.setValue({ x: start.x + dx, y: start.y + dy - d.offset });
                                    updateTarget();
                                }
                            }} onEnd={success => finish(id, success)}>
                            {renderItem(id, visible && !editing)}
                        </MovingTile>;
                    })}
                </View>
            </Animated.ScrollView>
        </GestureDetector>
    </View>;
}

function MovingTile({ position, editing, saving, active, movement, scrollOffset, releasePosition, native, onHeight, onBegin, onMove, onEnd, children }: {
    position: TilePosition; editing: boolean; saving: boolean; active: boolean; movement: Animated.ValueXY;
    scrollOffset: Animated.Value; releasePosition: RefObject<{ x: number; y: number }>;
    native: ReturnType<typeof Gesture.Native>; onHeight: (height: number) => void;
    onBegin: (y: number) => void; onMove: (dx: number, dy: number, y: number) => void; onEnd: (success: boolean) => void; children: ReactNode;
}) {
    const location = useRef(new Animated.ValueXY({ x: position.x, y: position.y })).current;
    const wobble = useRef(new Animated.Value(0)).current;
    const callbacks = useRef({ onBegin, onMove, onEnd });
    callbacks.current = { onBegin, onMove, onEnd };
    const pan = useMemo(() => Gesture.Pan().enabled(editing && !saving).activateAfterLongPress(300)
        .blocksExternalGesture(native).runOnJS(true)
        .onStart(e => callbacks.current.onBegin(e.absoluteY))
        .onUpdate(e => callbacks.current.onMove(e.translationX, e.translationY, e.absoluteY))
        .onFinalize((_e, success) => callbacks.current.onEnd(success)), [editing, saving, native]);
    const wasActive = useRef(false);
    const dragY = useMemo(() => Animated.add(movement.y, scrollOffset), [movement, scrollOffset]);
    useEffect(() => {
        if (active) { wasActive.current = true; location.stopAnimation(); return; }
        if (wasActive.current) { location.setValue(releasePosition.current); wasActive.current = false; }
        const animation = Animated.spring(location, { toValue: { x: position.x, y: position.y }, useNativeDriver: true, speed: 22, bounciness: 0, isInteraction: false });
        animation.start(); return () => animation.stop();
    }, [position.x, position.y, active, location, releasePosition]);
    useEffect(() => {
        wobble.setValue(0);
        if (!editing || saving || active) return;
        const animation = Animated.loop(Animated.sequence([
            Animated.timing(wobble, { toValue: 1, duration: 180, useNativeDriver: true, isInteraction: false }),
            Animated.timing(wobble, { toValue: -1, duration: 360, useNativeDriver: true, isInteraction: false }),
            Animated.timing(wobble, { toValue: 0, duration: 180, useNativeDriver: true, isInteraction: false }),
        ]));
        animation.start(); return () => animation.stop();
    }, [editing, saving, active, wobble]);
    return <GestureDetector gesture={pan}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: position.width,
            zIndex: active ? 100 : 0, elevation: active ? 12 : 0,
            transform: [...(active ? [{ translateX: movement.x }, { translateY: dragY }] : location.getTranslateTransform()), { scale: active ? 1.04 : 1 }, { rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-0.7deg', '0.7deg'] }) }],
        }}>
            <View onLayout={e => onHeight(e.nativeEvent.layout.height)} pointerEvents={editing ? 'none' : 'auto'}>{children}</View>
        </Animated.View>
    </GestureDetector>;
}
const styles = StyleSheet.create({ viewport: { flex: 1 }, content: { paddingHorizontal: 12, paddingBottom: 24 } });
