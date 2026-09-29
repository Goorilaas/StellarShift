import { useEffect, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

export function shouldDismissSheet(dy: number, vy: number, height: number): boolean {
    return dy >= height * 0.2 || (dy >= 24 && vy > 0.8);
}

// Responder належить лише ручці, ніколи — контейнеру списку фотографій.
export function useSheetDismiss(visible: boolean, height: number, onClose: () => void) {
    const slide = useRef(new Animated.Value(height)).current;
    const running = useRef<Animated.CompositeAnimation | null>(null);
    const current = useRef({ visible, height, onClose });
    current.current = { visible, height, onClose };
    const closing = useRef(false);
    const generation = useRef(0);
    const returnToTop = () => {
        running.current?.stop();
        const animation = Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 });
        running.current = animation;
        animation.start();
    };
    const responder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => current.current.visible && !closing.current && gesture.dy > 5 && gesture.dy > Math.abs(gesture.dx),
        onPanResponderGrant: () => { running.current?.stop(); slide.setValue(0); },
        onPanResponderMove: (_event, gesture) => {
            if (!closing.current) slide.setValue(Math.max(0, Math.min(current.current.height, gesture.dy)));
        },
        onPanResponderRelease: (_event, gesture) => {
            if (closing.current || !current.current.visible) return;
            if (!shouldDismissSheet(gesture.dy, gesture.vy, current.current.height)) { returnToTop(); return; }
            closing.current = true;
            const session = generation.current;
            const animation = Animated.timing(slide, { toValue: current.current.height, duration: 200, useNativeDriver: true });
            running.current = animation;
            animation.start(({ finished }) => {
                if (finished && session === generation.current && current.current.visible) current.current.onClose();
            });
        },
        onPanResponderTerminate: () => { if (!closing.current && current.current.visible) returnToTop(); },
        onPanResponderTerminationRequest: () => false,
    })).current;
    useEffect(() => {
        generation.current++;
        closing.current = false;
        running.current?.stop();
        const animation = Animated.timing(slide, { toValue: visible ? 0 : height, duration: 240, useNativeDriver: true });
        running.current = animation;
        animation.start();
        return () => { generation.current++; running.current?.stop(); };
    }, [visible, height, slide]);
    return { slide, panHandlers: responder.panHandlers };
}
