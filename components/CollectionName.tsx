import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeCollectionName } from '../services/collectionNames';

type Props = { name: string; editing?: boolean; disabled?: boolean; lines?: number;
    onOpen: () => void; onLongPress?: () => void; onSave: (name: string) => Promise<void>;
    onEditingChange?: (value: boolean) => void };
export default function CollectionName({ name, editing, disabled, lines = 1, onOpen, onLongPress, onSave, onEditingChange }: Props) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<string | null>(null);
    const [error, setError] = useState<'invalid' | 'save' | null>(null);
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const input = useRef<TextInput>(null);
    const notify = useRef(onEditingChange); notify.current = onEditingChange;
    const active = draft !== null;
    useEffect(() => {
        if (!active) return;
        notify.current?.(true);
        const cancel = () => {
            if (!busy.current) { setDraft(null); setError(null); Keyboard.dismiss(); }
            return true;
        };
        const back = BackHandler.addEventListener('hardwareBackPress', cancel);
        const keyboard = Keyboard.addListener('keyboardDidHide', cancel);
        return () => { back.remove(); keyboard.remove(); notify.current?.(false); };
    }, [active]);
    useEffect(() => { if (!saving && error === 'save') input.current?.focus(); }, [saving, error]);
    const save = async () => {
        if (busy.current || draft === null) return;
        try { normalizeCollectionName(draft); } catch { setError('invalid'); return; }
        busy.current = true; setSaving(true); setError(null);
        try { await onSave(draft); setDraft(null); Keyboard.dismiss(); }
        catch { setError('save'); }
        finally { busy.current = false; setSaving(false); }
    };
    return <View style={{ minHeight: lines === 2 ? 44 : 38, justifyContent: 'center' }}>
        {active ? <TextInput ref={input} editable={!saving} autoFocus value={draft} onChangeText={setDraft} multiline={false}
            returnKeyType="done" blurOnSubmit={false} onSubmitEditing={save}
            onBlur={() => { if (!busy.current) { setDraft(null); setError(null); } }}
            accessibilityLabel={t('collectionOrder.rename')} style={styles.input} />
            : <Pressable disabled={disabled} onLongPress={onLongPress} delayLongPress={400}
                onPress={() => { if (editing) { setDraft(name); setError(null); } else onOpen(); }}
                accessibilityRole="button" accessibilityLabel={editing ? t('collectionOrder.rename') + ': ' + name : name}>
                <Text numberOfLines={lines} style={styles.name}>{name}</Text>
            </Pressable>}
        {error && <Text numberOfLines={2} accessibilityRole="alert" style={styles.error}>{t(error === 'invalid' ? 'collectionOrder.nameError' : 'collectionOrder.nameSaveError')}</Text>}
    </View>;
}
const styles = StyleSheet.create({
    name: { color: '#fff', fontSize: 17, fontWeight: '600' },
    input: { color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#AFA9EC', borderRadius: 8, padding: 6, minHeight: 38 },
    error: { color: '#ffafaf', fontSize: 12 },
});
