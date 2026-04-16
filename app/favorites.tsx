import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Dimensions,
    FlatList, Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Photo } from './components/categories';

const { width, height } = Dimensions.get('window');
const IMG_SIZE = (width - 36) / 2;

export default function FavoritesScreen() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    const loadFavorites = async () => {
        const saved = await AsyncStorage.getItem('favorites_data');
        if (saved) setPhotos(JSON.parse(saved));
        else setPhotos([]);
    };

    const removeFavorite = async (photo: Photo) => {
        const newPhotos = photos.filter(p => p.id !== photo.id);
        setPhotos(newPhotos);
        await AsyncStorage.setItem('favorites_data', JSON.stringify(newPhotos));
        const newIds = newPhotos.map(p => p.id);
        await AsyncStorage.setItem('favorites', JSON.stringify(newIds));
        setSelectedPhoto(null);
    };

    const renderPhoto = ({ item }: { item: Photo }) => (
        <TouchableOpacity style={styles.photoCard} onPress={() => setSelectedPhoto(item)}>
            <Image source={{ uri: item.urls.small }} style={styles.photo} resizeMode="cover" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>❤️ Улюблені</Text>

            {photos.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🌌</Text>
                    <Text style={styles.emptyText}>Ще немає збережених шпалер</Text>
                    <Text style={styles.emptySub}>Натисни ❤️ на будь-якій картинці в каталозі</Text>
                </View>
            ) : (
                <FlatList
                    data={photos}
                    numColumns={2}
                    keyExtractor={i => i.id}
                    columnWrapperStyle={styles.row}
                    renderItem={renderPhoto}
                />
            )}

            {/* Повноекранний перегляд */}
            <Modal visible={!!selectedPhoto} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <TouchableWithoutFeedback onPress={() => setSelectedPhoto(null)}>
                        <Image
                            source={{ uri: selectedPhoto?.urls?.full }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalBtn, { borderColor: '#e05' }]}
                            onPress={() => removeFavorite(selectedPhoto)}
                        >
                            <Text style={styles.modalBtnText}>🗑 Видалити</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalBtnClose}
                            onPress={() => setSelectedPhoto(null)}
                        >
                            <Text style={styles.modalBtnText}>✕ Закрити</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a1a', paddingTop: 50 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff', paddingHorizontal: 16, marginBottom: 16 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 18, color: '#fff', fontWeight: '600' },
    emptySub: { fontSize: 13, color: '#555', textAlign: 'center', paddingHorizontal: 40 },
    row: { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
    photoCard: { borderRadius: 12, overflow: 'hidden' },
    photo: { width: IMG_SIZE, height: IMG_SIZE * 1.5, borderRadius: 12 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: width, height: height * 0.75 },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, paddingHorizontal: 24 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#534AB7', alignItems: 'center' },
    modalBtnClose: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});