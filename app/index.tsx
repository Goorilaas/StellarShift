import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Blessing, nextBlessingFromQueue } from '../components/blessings';
import FavoriteHeart from '../components/FavoriteHeart';
import { Category, CATEGORIES, CHAOS_CATEGORY, CHAOS_QUERIES, filterNoPeople, pickCategoryQueries, Photo, SEARCH_SUGGESTIONS, sortCategoriesByLabel } from '../components/categories';
import ConfirmDialog from '../components/ConfirmDialog';
import { ensureGalleryPermission } from '../services/galleryPermission';
import { randomCheer } from '../services/cheer';
import { getUnsplashKey, useUnsplashKey } from '../services/unsplashKey';
import { ICON } from '../components/icons';
import SkeletonCard from '../components/SkeletonCard';
import Toast, { useToastQueue } from '../components/Toast';
import { blockPhoto as blockPhotoStore, getBlockedIds, unblockPhoto as unblockPhotoStore } from '../services/blocked';
import { setWallpaperFromUrl } from '../services/wallpaperService';
import { openAuthorProfile, trackDownload } from '../services/unsplashTracking';

const { width, height } = Dimensions.get('window');
const IMG_SIZE = (width - 36) / 2;

type LogoStar = { id: number; tx: number; ty: number; opacity: Animated.Value; translateX: Animated.Value; translateY: Animated.Value; scale: Animated.Value };

// Fisher-Yates shuffle
// Translates an axios fetch error into an i18n key for user-facing toast.
// 403 не маплимо тут — це окремий BYO-rate-limit flow (trigger403 показує діалог).
function mapFetchError(e: any): string {
  if (e?.response?.status === 401) return 'catalog.toast.errKey';
  if (e?.response?.status === 429) return 'catalog.toast.errRate';
  if (!e?.response) return 'catalog.toast.errNet'; // axios ставить response=undefined для network/timeout
  return 'catalog.toast.errLoad';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LOGO_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="neb1" cx="40%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#4433aa" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="#221166" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0a0a1a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="neb2" cx="60%" cy="55%" r="50%">
      <stop offset="0%" stop-color="#aa2266" stop-opacity="0.4"/>
      <stop offset="50%" stop-color="#661133" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0a0a1a" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip"><circle cx="50" cy="50" r="48"/></clipPath>
  </defs>
  <circle cx="50" cy="50" r="50" fill="#0a0a1a"/>
  <circle cx="50" cy="50" r="48" fill="none" stroke="#1a1a3e" stroke-width="1"/>
  <g clip-path="url(#clip)">
    <rect x="0" y="0" width="100" height="100" fill="url(#neb1)"/>
    <rect x="0" y="0" width="100" height="100" fill="url(#neb2)"/>
    <ellipse cx="35" cy="38" rx="25" ry="14" fill="#3322aa" opacity="0.18" transform="rotate(-20 35 38)"/>
    <ellipse cx="65" cy="62" rx="20" ry="11" fill="#aa2255" opacity="0.14" transform="rotate(15 65 62)"/>
  </g>
  <circle cx="24" cy="22" r="1" fill="#aaa" opacity="0.7"/>
  <circle cx="74" cy="18" r="0.8" fill="#9988ee" opacity="0.8"/>
  <circle cx="15" cy="55" r="0.7" fill="#fff" opacity="0.5"/>
  <circle cx="82" cy="62" r="1" fill="#7766dd" opacity="0.7"/>
  <circle cx="52" cy="88" r="0.7" fill="#aaa" opacity="0.5"/>
  <circle cx="28" cy="78" r="0.8" fill="#9988ee" opacity="0.6"/>
  <circle cx="18" cy="38" r="0.7" fill="#fff" opacity="0.4"/>
  <circle cx="65" cy="12" r="0.8" fill="#7766dd" opacity="0.6"/>
  <circle cx="85" cy="40" r="0.6" fill="#fff" opacity="0.5"/>
  <circle cx="20" cy="68" r="0.7" fill="#cc99ff" opacity="0.5"/>
  <path d="M50,50 Q62,33 74,42 Q86,55 76,72 Q63,84 50,79 Q30,70 27,50 Q27,25 44,16 Q65,7 76,22" fill="none" stroke="#534AB7" stroke-width="2.2" opacity="0.9" stroke-linecap="round"/>
  <path d="M50,50 Q38,67 26,58 Q14,45 22,28 Q35,15 50,20 Q70,30 73,50 Q73,75 58,82 Q38,90 22,76" fill="none" stroke="#7F77DD" stroke-width="1.3" opacity="0.4" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="12" fill="#1a1050" opacity="0.8"/>
  <circle cx="50" cy="50" r="8" fill="#534AB7" opacity="0.95"/>
  <circle cx="50" cy="50" r="4" fill="#AFA9EC"/>
  <circle cx="50" cy="50" r="1.5" fill="white"/>
</svg>`;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { trigger403 } = useUnsplashKey();
  const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [authorInfoOpen, setAuthorInfoOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [blockConfirm, setBlockConfirm] = useState<Photo | null>(null);
  const { toast, showToast, dismissToast } = useToastQueue();
  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pinnedCats, setPinnedCats] = useState<string[]>([]);
  const [hiddenCats, setHiddenCats] = useState<string[]>([]);
  const [catMenuTarget, setCatMenuTarget] = useState<Category | null>(null);
  const [settingWallpaper, setSettingWallpaper] = useState(false);
  const [chaosUnlocked, setChaosUnlocked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;
  const heartTranslateY = useRef(new Animated.Value(0)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const catListRef = useRef<FlatList<Category>>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Активний під-запит ротаційної категорії — тримаємо стабільним для infinite
  // scroll, перевибираємо на pull-to-refresh. Для не-ротаційних = base query.
  const catalogQueryRef = useRef<string>('');

  // Easter на лого головної: tap = blessing, 3 tap = blessing + spin (без unlock — той окремо в settings)
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoStars, setLogoStars] = useState<LogoStar[]>([]);
  const [logoBlessing, setLogoBlessing] = useState<Blessing | null>(null);
  const logoBlessingOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const logoStarIdRef = useRef(0);
  const logoBlessingQueueRef = useRef<Blessing[]>([]);

  const fireLogoBlessing = () => {
    const phrase = nextBlessingFromQueue(logoBlessingQueueRef);
    setLogoBlessing(phrase);
    const newStars: LogoStar[] = Array.from({ length: 6 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.6;
      const dist = 70 + Math.random() * 35;
      return {
        id: logoStarIdRef.current++,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        opacity: new Animated.Value(1),
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(0.4),
      };
    });
    setLogoStars(prev => [...prev, ...newStars]);
    newStars.forEach(s => {
      Animated.parallel([
        Animated.timing(s.translateX, { toValue: s.tx, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(s.translateY, { toValue: s.ty, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(s.scale, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(s.opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]).start(() => {
        setLogoStars(prev => prev.filter(p => p.id !== s.id));
      });
    });
    Animated.sequence([
      Animated.timing(logoBlessingOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(logoBlessingOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setLogoBlessing(null));
  };

  const fireLogoSpin = () => {
    logoRotation.setValue(0);
    Animated.timing(logoRotation, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleLogoTap = () => {
    logoTapCountRef.current += 1;
    if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
    logoTapTimerRef.current = setTimeout(() => {
      const count = logoTapCountRef.current;
      logoTapCountRef.current = 0;
      if (count >= 3) {
        fireLogoSpin();
        fireLogoBlessing();
      } else {
        fireLogoBlessing();
      }
    }, 350);
  };


  useEffect(() => {
    loadFavorites();
    AsyncStorage.getItem('search_history')
      .then(raw => { if (raw) setSearchHistory(JSON.parse(raw)); })
      .catch(() => { });
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('easter_unlocked').then(v => setChaosUnlocked(v === '1'));
      getBlockedIds().then(setBlockedIds);
      // pin/hide перечитуємо на focus — Settings міг повернути приховані
      AsyncStorage.getItem('pinned_categories').then(v => setPinnedCats(v ? JSON.parse(v) : [])).catch(() => { });
      AsyncStorage.getItem('hidden_categories').then(v => setHiddenCats(v ? JSON.parse(v) : [])).catch(() => { });
    }, [])
  );

  const sortedList = sortCategoriesByLabel(
    chaosUnlocked
      ? [
          ...CATEGORIES.filter(c => c.id === 'mix'),
          CHAOS_CATEGORY,
          ...CATEGORIES.filter(c => c.id !== 'mix'),
        ]
      : CATEGORIES,
    t,
    i18n.language,
  );
  // Порядок ряду: Mix → закріплені (в порядку закріплення) → решта мінус приховані
  const categoryList = [
    ...sortedList.filter(c => c.id === 'mix'),
    ...pinnedCats.map(id => sortedList.find(c => c.id === id)).filter((c): c is Category => !!c),
    ...sortedList.filter(c => c.id !== 'mix' && !pinnedCats.includes(c.id) && !hiddenCats.includes(c.id)),
  ];

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (activeCategory.id === 'mix') {
      loadMix();
    } else if (activeCategory.id === 'chaos') {
      loadChaos();
    } else if (activeCategory.id !== 'search') {
      catalogQueryRef.current = pickCategoryQueries(activeCategory.id, 1)[0] ?? activeCategory.query;
      loadPhotos(catalogQueryRef.current, 1, activeCategory);
    }
  }, [activeCategory]);

  const loadFavorites = async () => {
    const saved = await AsyncStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
  };

  const triggerHeartAnim = () => {
    setShowHeart(true);
    heartScale.setValue(0);
    heartOpacity.setValue(0);
    heartTranslateY.setValue(0);
    heartRotate.setValue(0);
    Animated.parallel([
      // pop-in
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 16, bounciness: 14 }),
        Animated.spring(heartScale, { toValue: 1.1, useNativeDriver: true, speed: 12 }),
      ]),
      // fade in fast → hold → fade out slow with float up
      Animated.sequence([
        Animated.timing(heartOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(heartOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(heartTranslateY, { toValue: -50, duration: 450, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1.4, duration: 450, useNativeDriver: true }),
        ]),
      ]),
      // subtle wobble
      Animated.sequence([
        Animated.timing(heartRotate, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(heartRotate, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(heartRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ]).start(() => setShowHeart(false));
  };

  const handleModalImageTap = (photo: Photo) => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      lastTapRef.current = 0;
      if (!favorites.includes(photo.id)) {
        toggleFavorite(photo);
        triggerHeartAnim();
      }
      // вже в улюблених — ігноруємо, без анімації
    } else {
      lastTapRef.current = now;
    }
  };

  const loadMix = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setPhotos([]);
    try {
      const s = await AsyncStorage.getItem('settings');
      const mixIds: string[] = s
        ? (JSON.parse(s).mixCategories ?? CATEGORIES.filter(c => c.id !== 'mix').map(c => c.id))
        : CATEGORIES.filter(c => c.id !== 'mix').map(c => c.id);
      const allQueries = mixIds
        .map(id => pickCategoryQueries(id, 1)[0] ?? CATEGORIES.find(c => c.id === id)?.query)
        .filter((q): q is string => !!q);
      const pool = allQueries.length > 0 ? allQueries : CATEGORIES.filter(c => c.query).map(c => c.query);
      const randomQueries = shuffle(pool).slice(0, 8);
      const key = await getUnsplashKey();
      const results = await Promise.all(
        randomQueries.map(q =>
          axios.get('https://api.unsplash.com/search/photos', {
            params: { query: q, page: Math.ceil(Math.random() * 3), per_page: 10, orientation: 'portrait' },
            headers: { Authorization: `Client-ID ${key}` },
            signal: abortRef.current?.signal,
          })
        )
      );
      const flat: Photo[] = results.flatMap(r => r.data.results);
      const filtered = filterNoPeople(flat);
      setPhotos(shuffle(filtered.length >= 8 ? filtered : flat));
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      if (e?.response?.status === 403) { trigger403(); return; }
      showToast(t(mapFetchError(e)));
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  const loadChaos = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setPhotos([]);
    try {
      const queries = shuffle([...CHAOS_QUERIES]).slice(0, 6);
      const key = await getUnsplashKey();
      const results = await Promise.all(
        queries.map(q =>
          axios.get('https://api.unsplash.com/search/photos', {
            params: { query: q, page: Math.ceil(Math.random() * 3), per_page: 12, orientation: 'portrait' },
            headers: { Authorization: `Client-ID ${key}` },
            signal: abortRef.current?.signal,
          })
        )
      );
      const flat: Photo[] = results.flatMap(r => r.data.results);
      const filtered = filterNoPeople(flat);
      const seen = new Set<string>();
      const dedup = (filtered.length >= 8 ? filtered : flat).filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      setPhotos(shuffle(dedup));
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      if (e?.response?.status === 403) { trigger403(); return; }
      showToast(t(mapFetchError(e)));
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  const loadPhotos = async (query: string, pageNum: number, category?: Category) => {
    if (pageNum === 1) {
      setLoading(true);
      setPhotos([]);
    } else {
      if (isFetchingMore) return;
      setIsFetchingMore(true);
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const cat = category ?? CATEGORIES.find(c => c.query === query);
      const perPage = cat?.excludePeople ? 30 : 20;
      // На першому завантаженні беремо рандомну сторінку 1-3, щоб одна категорія
      // не була завжди тими ж 30 фото. Infinite scroll далі додає послідовно.
      const apiPage = pageNum === 1 ? Math.ceil(Math.random() * 3) : pageNum;
      const key = await getUnsplashKey();
      const res = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, page: apiPage, per_page: perPage, orientation: 'portrait' },
        headers: { Authorization: `Client-ID ${key}` },
        signal: abortRef.current?.signal,
      });
      const incoming: Photo[] = res.data.results;
      const filtered = cat?.excludePeople ? filterNoPeople(incoming) : incoming;
      const final = cat?.excludePeople && filtered.length < 6 ? incoming : filtered;
      if (pageNum === 1) {
        setPhotos(final);
      } else {
        setPhotos(prev => [...prev, ...final]);
      }
      setPage(apiPage);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      if (e?.response?.status === 403) { trigger403(); return; }
      showToast(t(mapFetchError(e)));
    }
    setLoading(false);
    setIsFetchingMore(false);
  };

  const toggleFavorite = async (photo: Photo) => {
    const saved = await AsyncStorage.getItem('favorites_data');
    const data: Photo[] = saved ? JSON.parse(saved) : [];

    const isAlreadyFav = data.some(p => p.id === photo.id);

    if (isAlreadyFav) {
      const newData = data.filter(p => p.id !== photo.id);
      const newIds = newData.map(p => p.id);
      setFavorites(newIds);
      await AsyncStorage.setItem('favorites', JSON.stringify(newIds));
      await AsyncStorage.setItem('favorites_data', JSON.stringify(newData));
    } else {
      const newData = [...data, photo];
      const newIds = newData.map(p => p.id);
      setFavorites(newIds);
      await AsyncStorage.setItem('favorites', JSON.stringify(newIds));
      await AsyncStorage.setItem('favorites_data', JSON.stringify(newData));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
  };

  const setAsWallpaper = async (photo: Photo) => {
    setSettingWallpaper(true);
    showToast(randomCheer(t));
    try {
      const settings = await AsyncStorage.getItem('settings');
      const target = settings ? (JSON.parse(settings).applyTo ?? 'both') : 'both';
      await setWallpaperFromUrl(photo.urls.regular, target, { id: photo.id, small: photo.urls.small, downloadLocation: photo.links?.download_location });
      setSelectedPhoto(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      showToast(t('catalog.toast.applied'));
    } catch {
      showToast(t('catalog.toast.applyFail'));
    } finally {
      setSettingWallpaper(false);
    }
  };

  const saveToGallery = async (photo: Photo) => {
    try {
      const granted = await ensureGalleryPermission(t);
      if (!granted) return;
      showToast(randomCheer(t));
      const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_${photo.id}.jpg`;
      const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
      await MediaLibrary.saveToLibraryAsync(uri);
      try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
      trackDownload(photo.links?.download_location);
      showToast(t('catalog.toast.saved'));
    } catch {
      showToast(t('catalog.toast.downloadFail'));
    }
  };

  const sharePhoto = async (photo: Photo) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        showToast(t('catalog.toast.shareUnavailable'));
        return;
      }
      showToast(t('catalog.toast.preparing'));
      const dest = (FileSystem.cacheDirectory ?? '') + `stellarshift_share_${photo.id}.jpg`;
      const { uri } = await FileSystem.downloadAsync(photo.urls.regular, dest);
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: t('catalog.shareDialog') });
      try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch { }
      trackDownload(photo.links?.download_location);
    } catch {
      showToast(t('catalog.toast.shareFail'));
    }
  };

  const handleSearch = (q?: string) => {
    const query = (q ?? searchText).trim();
    if (!query) return;
    if (q) setSearchText(q);
    setActiveCategory({ id: 'search', labelKey: 'categories.search', label: t('categories.search'), query, icon: '' });
    setPhotos([]);
    loadPhotos(query, 1);
    // Історія: останні 5 унікальних, найсвіжіший перший
    setSearchHistory(prev => {
      const next = [query, ...prev.filter(x => x !== query)].slice(0, 5);
      AsyncStorage.setItem('search_history', JSON.stringify(next)).catch(() => { });
      return next;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    AsyncStorage.removeItem('search_history').catch(() => { });
  };

  const clearSearch = () => {
    setSearchText('');
    setActiveCategory(CATEGORIES[0]);
  };

  const handleCategory = (cat: Category) => {
    if (cat.id === activeCategory.id && cat.id === 'mix') {
      loadMix();
      return;
    }
    if (cat.id === activeCategory.id && cat.id === 'chaos') {
      loadChaos();
      return;
    }
    setActiveCategory(cat);
    setPhotos([]);
  };

  const persistPinned = (next: string[]) => {
    setPinnedCats(next);
    AsyncStorage.setItem('pinned_categories', JSON.stringify(next)).catch(() => { });
  };
  const persistHidden = (next: string[]) => {
    setHiddenCats(next);
    AsyncStorage.setItem('hidden_categories', JSON.stringify(next)).catch(() => { });
  };

  // Pin і hide взаємовиключні: закріплення знімає приховання і навпаки
  const togglePinCategory = (cat: Category) => {
    const isPinned = pinnedCats.includes(cat.id);
    persistPinned(isPinned ? pinnedCats.filter(id => id !== cat.id) : [...pinnedCats, cat.id]);
    if (!isPinned && hiddenCats.includes(cat.id)) {
      persistHidden(hiddenCats.filter(id => id !== cat.id));
    }
    Haptics.selectionAsync().catch(() => { });
    setCatMenuTarget(null);
  };

  const hideCategory = (cat: Category) => {
    if (!hiddenCats.includes(cat.id)) persistHidden([...hiddenCats, cat.id]);
    if (pinnedCats.includes(cat.id)) persistPinned(pinnedCats.filter(id => id !== cat.id));
    // ховаємо активну → стрибок на Mix
    if (activeCategory.id === cat.id) handleCategory(CATEGORIES[0]);
    Haptics.selectionAsync().catch(() => { });
    setCatMenuTarget(null);
    showToast(t('catalog.toast.catHidden'));
  };

  // Swipe по гриду гортає категорії в порядку чіп-рядка. Стоп на краях, без wrap.
  // У режимі пошуку вимкнено — активна «категорія» там синтетична.
  const swipeCategory = (dir: 1 | -1) => {
    if (activeCategory.id === 'search') return;
    const idx = categoryList.findIndex(c => c.id === activeCategory.id);
    if (idx === -1) return;
    const nextIdx = idx + dir;
    const next = categoryList[nextIdx];
    if (!next) return;
    Haptics.selectionAsync().catch(() => { });
    handleCategory(next);
    catListRef.current?.scrollToIndex({ index: nextIdx, viewPosition: 0.5, animated: true });
  };

  // activeOffsetX — пан активується лише на виразно горизонтальному русі,
  // failOffsetY віддає вертикаль скролу сітки. runOnJS — без reanimated-worklets.
  const categorySwipeGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-12, 12])
    .onEnd(e => {
      if (Math.abs(e.translationX) < 60) return;
      swipeCategory(e.translationX < 0 ? 1 : -1);
    });

  const visiblePhotos = photos.filter(p => !blockedIds.has(p.id));

  const handleBlockConfirm = async () => {
    const photo = blockConfirm;
    setBlockConfirm(null);
    if (!photo) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
    const wasFav = favorites.includes(photo.id);
    // Add to blocked store
    await blockPhotoStore({ id: photo.id, small: photo.urls.small });
    setBlockedIds(prev => new Set(prev).add(photo.id));
    // Silently remove from favorites if present
    if (wasFav) {
      const raw = await AsyncStorage.getItem('favorites_data');
      const data: Photo[] = raw ? JSON.parse(raw) : [];
      const newData = data.filter(p => p.id !== photo.id);
      const newIds = newData.map(p => p.id);
      setFavorites(newIds);
      await AsyncStorage.setItem('favorites', JSON.stringify(newIds));
      await AsyncStorage.setItem('favorites_data', JSON.stringify(newData));
    }
    // Mark that autoChange pool needs rebuild — settings.tsx читає на focus
    try {
      await AsyncStorage.setItem('pool_dirty', '1');
    } catch { /* ігнор */ }
    setSelectedPhoto(null);
    showToast(t('catalog.toast.blocked'), {
      label: t('common.undo'),
      onPress: () => undoBlock(photo, wasFav),
    }, 5000);
  };

  const undoBlock = async (photo: Photo, wasFav: boolean) => {
    dismissToast();
    await unblockPhotoStore(photo.id);
    setBlockedIds(prev => {
      const next = new Set(prev);
      next.delete(photo.id);
      return next;
    });
    if (wasFav) {
      const raw = await AsyncStorage.getItem('favorites_data');
      const data: Photo[] = raw ? JSON.parse(raw) : [];
      if (!data.some(p => p.id === photo.id)) {
        const newData = [...data, photo];
        const newIds = newData.map(p => p.id);
        setFavorites(newIds);
        await AsyncStorage.setItem('favorites', JSON.stringify(newIds));
        await AsyncStorage.setItem('favorites_data', JSON.stringify(newData));
      }
    }
    try { await AsyncStorage.setItem('pool_dirty', '1'); } catch { /* ігнор */ }
    showToast(t('settings.toast.undone'));
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => setSelectedPhoto(item)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.urls.small }} style={styles.photo} resizeMode="cover" />
      <FavoriteHeart active={favorites.includes(item.id)} onToggle={() => toggleFavorite(item)} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Хедер */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleLogoTap} style={styles.logoRow}>
          <Animated.View style={{
            transform: [{
              rotate: logoRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
            }],
          }}>
            <SvgXml xml={LOGO_SVG} width={36} height={36} />
          </Animated.View>
          <Text style={styles.title}>{t('catalog.brand')}</Text>
          {logoStars.map(s => (
            <Animated.View
              key={s.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 18 - 8,
                top: 18 - 8,
                opacity: s.opacity,
                transform: [
                  { translateX: s.translateX },
                  { translateY: s.translateY },
                  { scale: s.scale },
                ],
              }}
            >
              <SvgXml xml={ICON.sparkle} width={16} height={16} />
            </Animated.View>
          ))}
        </TouchableOpacity>
        {activeCategory.id === 'mix' && (
          <TouchableOpacity style={styles.shuffleBtn} onPress={loadMix}>
            <SvgXml xml={`<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1,3 L3,3 Q6,3 8,7 Q6,11 3,11 L1,11" fill="none" stroke="#AFA9EC" stroke-width="1.3" stroke-linecap="round"/><path d="M10,1 L13,3 L10,5" fill="none" stroke="#AFA9EC" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M10,9 L13,11 L10,13" fill="none" stroke="#AFA9EC" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="3" x2="13" y2="3" stroke="#AFA9EC" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="11" x2="13" y2="11" stroke="#AFA9EC" stroke-width="1.3" stroke-linecap="round"/></svg>`} width={14} height={14} />
            <Text style={styles.shuffleBtnText}>{t('catalog.shuffle')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Пошук */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <SvgXml xml={ICON.search} width={16} height={16} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('catalog.searchPlaceholder')}
            placeholderTextColor="#555"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => handleSearch()}
            onFocus={() => {
              setSearchFocused(true);
              // свіжа порція підказок на кожен фокус
              setSuggestions(shuffle(SEARCH_SUGGESTIONS).slice(0, 6));
            }}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Історія пошуку: останні 5, видно коли поле у фокусі й порожнє */}
      {searchFocused && searchText.length === 0 && searchHistory.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.historyRow}
        >
          {searchHistory.map(q => (
            <TouchableOpacity key={q} style={styles.historyChip} onPress={() => handleSearch(q)}>
              <Text style={styles.historyChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.historyClearBtn} onPress={clearSearchHistory} hitSlop={8}>
            <Text style={styles.historyClearText}>✕</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Підказки пошуку: коли історії ще нема — рандомні 5-6 з пулу */}
      {searchFocused && searchText.length === 0 && searchHistory.length === 0 && suggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.historyRow}
        >
          {suggestions.map(q => (
            <TouchableOpacity key={q} style={[styles.historyChip, styles.suggestionChip]} onPress={() => handleSearch(q)}>
              <SvgXml xml={ICON.sparkle} width={11} height={11} />
              <Text style={styles.historyChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Категорії */}
      <FlatList
        ref={catListRef}
        data={categoryList}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.id}
        style={styles.catList}
        onScrollToIndexFailed={info => {
          catListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.chip,
              activeCategory.id === item.id && styles.chipActive,
              item.id === 'mix' && styles.chipMix,
              activeCategory.id === item.id && item.id === 'mix' && styles.chipMixActive,
            ]}
            onPress={() => handleCategory(item)}
            onLongPress={() => {
              if (item.id === 'mix') return; // Mix — якір, не чіпаємо
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
              setCatMenuTarget(item);
            }}
          >
            <SvgXml xml={item.icon} width={16} height={16} />
            <Text style={[styles.chipText, activeCategory.id === item.id && styles.chipTextActive]}>
              {item.labelKey ? t(item.labelKey) : item.label}
            </Text>
            {pinnedCats.includes(item.id) && (
              <SvgXml xml={ICON.pin} width={10} height={10} />
            )}
          </TouchableOpacity>
        )}
      />

      {/* Фото сітка. GestureDetector ловить горизонтальний swipe → сусідня категорія */}
      <GestureDetector gesture={categorySwipeGesture}>
      <View style={styles.photoGrid}>
        {loading && photos.length === 0 ? (
          <View style={styles.skeletonGrid}>
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={visiblePhotos}
            numColumns={2}
            keyExtractor={i => i.id}
            columnWrapperStyle={styles.row}
            renderItem={renderPhoto}
            initialNumToRender={10}
            windowSize={5}
            removeClippedSubviews={true}
            onEndReached={() => {
              if (activeCategory.id !== 'mix' && activeCategory.id !== 'chaos' && !loading) {
                loadPhotos(catalogQueryRef.current || activeCategory.query, page + 1, activeCategory);
              }
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={loading && photos.length > 0}
                onRefresh={() => {
                  if (activeCategory.id === 'mix') {
                    loadMix();
                  } else if (activeCategory.id === 'chaos') {
                    loadChaos();
                  } else {
                    catalogQueryRef.current = pickCategoryQueries(activeCategory.id, 1)[0] ?? activeCategory.query;
                    loadPhotos(catalogQueryRef.current, 1, activeCategory);
                  }
                }}
                colors={['#FFD700', '#534AB7', '#7F77DD']}
                progressBackgroundColor="#15152a"
                tintColor="#FFD700"
              />
            }
            ListFooterComponent={isFetchingMore ? <ActivityIndicator color="#7F77DD" style={{ marginVertical: 16 }} /> : null}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.gridEmpty}>
                  <SvgXml xml={ICON.search} width={56} height={56} />
                  <Text style={styles.gridEmptyTitle}>{t('catalog.empty.title')}</Text>
                  <Text style={styles.gridEmptySub}>{t('catalog.empty.sub')}</Text>
                  <TouchableOpacity
                    style={styles.gridEmptyCta}
                    onPress={() => {
                      if (activeCategory.id === 'mix') loadMix();
                      else if (activeCategory.id === 'chaos') loadChaos();
                      else loadPhotos(activeCategory.query, 1);
                    }}
                  >
                    <SvgXml xml={ICON.refresh} width={16} height={16} />
                    <Text style={styles.gridEmptyCtaText}>{t('catalog.empty.cta')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}
      </View>
      </GestureDetector>

      {/* Toast */}
      <Toast message={toast?.message ?? null} action={toast?.action} />

      {/* Blessing-попап від тапу по лого (центр екрану) */}
      {logoBlessing && (
        <Animated.View style={[styles.logoBlessingPopup, { opacity: logoBlessingOpacity }]} pointerEvents="none">
          <View style={styles.logoBlessingInner}>
            <SvgXml xml={ICON[logoBlessing.icon as keyof typeof ICON]} width={36} height={36} />
            <Text style={styles.logoBlessingText}>{logoBlessing.text}</Text>
          </View>
        </Animated.View>
      )}

      {/* Серце анімація (grid) */}
      {showHeart && (
        <Animated.View style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ translateY: heartTranslateY }, { scale: heartScale }, { rotate: heartRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) }] }]} pointerEvents="none">
          <SvgXml xml={ICON.heartGlow} width={180} height={180} />
        </Animated.View>
      )}

      {/* Модальне вікно */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <View style={styles.modalBg}>

          <Image
            source={{ uri: selectedPhoto?.urls?.small }}
            style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
            blurRadius={25}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

          {/* Пейджер фото: swipe вліво/вправо гортає каталог без закриття модалки.
              Подвійний тап на сторінці — в улюблені, як і раніше. */}
          <FlatList
            data={visiblePhotos}
            keyExtractor={p => p.id}
            extraData={favorites}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.max(0, visiblePhotos.findIndex(p => p.id === selectedPhoto?.id))}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              const next = visiblePhotos[idx];
              if (next && next.id !== selectedPhoto?.id) setSelectedPhoto(next);
            }}
            initialNumToRender={1}
            windowSize={3}
            maxToRenderPerBatch={2}
            style={StyleSheet.absoluteFill}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleModalImageTap(item)}>
                <Image
                  source={{ uri: item.urls.regular }}
                  style={styles.fullImage}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />

          {/* Серце анімація (модалка) */}
          {showHeart && (
            <Animated.View style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ translateY: heartTranslateY }, { scale: heartScale }, { rotate: heartRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) }] }]} pointerEvents="none">
              <SvgXml xml={ICON.heartGlow} width={180} height={180} />
            </Animated.View>
          )}

          <TouchableOpacity style={styles.closeTop} onPress={() => setSelectedPhoto(null)}>
            <Text style={styles.closeTopText}>✕</Text>
          </TouchableOpacity>

          {selectedPhoto && (
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => setAuthorInfoOpen(true)}
            >
              <Image source={{ uri: selectedPhoto.user.profile_image?.small }} style={styles.authorAvatar} />
              <View>
                <Text style={styles.authorName}>{selectedPhoto.user.name}</Text>
                <Text style={styles.authorUsername}>@{selectedPhoto.user.username} · Unsplash ›</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, favorites.includes(selectedPhoto?.id ?? '') && styles.modalBtnActive]}
              onPress={() => {
                if (!selectedPhoto) return;
                const wasFav = favorites.includes(selectedPhoto.id);
                toggleFavorite(selectedPhoto);
                if (!wasFav) triggerHeartAnim();
              }}
            >
              <SvgXml xml={favorites.includes(selectedPhoto?.id ?? '') ? ICON.heartFilled : ICON.heartOutline} width={18} height={18} />
              <Text style={styles.modalBtnText}>
                {favorites.includes(selectedPhoto?.id ?? '') ? t('catalog.modal.inFav') : t('catalog.modal.addToFav')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { marginTop: 12, borderColor: 'rgba(29,158,117,0.6)', opacity: settingWallpaper ? 0.6 : 1 }]}
              onPress={() => selectedPhoto && setAsWallpaper(selectedPhoto)}
              disabled={settingWallpaper}
            >
              <SvgXml xml={ICON.wallpaper} width={18} height={18} />
              <Text style={styles.modalBtnText}>
                {settingWallpaper ? t('catalog.modal.setting') : t('catalog.modal.setWallpaper')}
              </Text>
            </TouchableOpacity>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => selectedPhoto && saveToGallery(selectedPhoto)}>
                <SvgXml xml={ICON.save} width={22} height={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => selectedPhoto && sharePhoto(selectedPhoto)}>
                <SvgXml xml={ICON.share} width={22} height={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => selectedPhoto && setBlockConfirm(selectedPhoto)}>
                <SvgXml xml={ICON.blocked} width={22} height={22} />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </Modal>

      <ConfirmDialog
        visible={!!blockConfirm}
        title={t('catalog.block.title')}
        message={t('catalog.block.message')}
        confirmLabel={t('catalog.block.confirm')}
        destructive
        onConfirm={handleBlockConfirm}
        onCancel={() => setBlockConfirm(null)}
      />

      {/* Long-press меню категорії: закріпити / приховати */}
      <Modal visible={!!catMenuTarget} transparent animationType="fade" onRequestClose={() => setCatMenuTarget(null)}>
        <Pressable style={styles.catMenuBackdrop} onPress={() => setCatMenuTarget(null)}>
          {catMenuTarget && (
            <Pressable style={styles.catMenuCard} onPress={() => { }}>
              <View style={styles.catMenuHeader}>
                <SvgXml xml={catMenuTarget.icon} width={18} height={18} />
                <Text style={styles.catMenuTitle}>
                  {catMenuTarget.labelKey ? t(catMenuTarget.labelKey) : catMenuTarget.label}
                </Text>
              </View>
              <TouchableOpacity style={styles.catMenuRow} onPress={() => togglePinCategory(catMenuTarget)}>
                <SvgXml xml={ICON.pin} width={16} height={16} />
                <Text style={styles.catMenuRowText}>
                  {pinnedCats.includes(catMenuTarget.id) ? t('catalog.catMenu.unpin') : t('catalog.catMenu.pin')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.catMenuRow} onPress={() => hideCategory(catMenuTarget)}>
                <SvgXml xml={ICON.blocked} width={16} height={16} />
                <Text style={styles.catMenuRowText}>{t('catalog.catMenu.hide')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.catMenuCancel} onPress={() => setCatMenuTarget(null)}>
                <Text style={styles.catMenuCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      <Modal visible={authorInfoOpen && !!selectedPhoto} transparent animationType="fade" onRequestClose={() => setAuthorInfoOpen(false)}>
        <Pressable style={styles.authorInfoBackdrop} onPress={() => setAuthorInfoOpen(false)}>
          <Pressable style={styles.authorInfoCard} onPress={(e) => e.stopPropagation()}>
            {selectedPhoto && (
              <>
                <View style={styles.authorInfoHeader}>
                  <Image source={{ uri: selectedPhoto.user.profile_image?.medium || selectedPhoto.user.profile_image?.small }} style={styles.authorInfoAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.authorInfoName}>{selectedPhoto.user.name}</Text>
                    <Text style={styles.authorInfoHandle}>@{selectedPhoto.user.username} · Unsplash</Text>
                  </View>
                </View>
                <Text style={styles.authorInfoDesc}>
                  {selectedPhoto.description || selectedPhoto.alt_description || t('catalog.author.fallbackDesc')}
                </Text>
                <View style={styles.authorInfoActions}>
                  <TouchableOpacity
                    style={styles.authorInfoLink}
                    onPress={() => openAuthorProfile(selectedPhoto.user.username)}
                  >
                    <Text style={styles.authorInfoLinkText}>{t('catalog.author.openProfile')}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.authorInfoClose} onPress={() => setAuthorInfoOpen(false)}>
                  <Text style={styles.authorInfoCloseText}>{t('common.close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4, marginTop: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  shuffleBtn: { backgroundColor: '#1a1a2e', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#534AB7', flexDirection: 'row', alignItems: 'center', gap: 6 },
  shuffleBtnText: { color: '#7F77DD', fontSize: 13, fontWeight: '600' },
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#2a2a3e' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 10 },
  searchClear: { color: '#555', fontSize: 16, paddingLeft: 8 },
  historyRow: { paddingHorizontal: 16, marginBottom: 10, flexGrow: 0 },
  historyChip: {
    backgroundColor: '#15152a', borderWidth: 1, borderColor: '#232347',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
  },
  historyChipText: { color: '#9b96d0', fontSize: 13 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catMenuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  catMenuCard: {
    backgroundColor: '#15152a', borderRadius: 18, borderWidth: 1, borderColor: '#232347',
    paddingVertical: 8, width: 260,
  },
  catMenuHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#232347',
  },
  catMenuTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  catMenuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 13 },
  catMenuRowText: { color: '#e8e6f5', fontSize: 14 },
  catMenuCancel: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#232347' },
  catMenuCancelText: { color: '#9b96d0', fontSize: 14, fontWeight: '600' },
  historyClearBtn: { justifyContent: 'center', paddingHorizontal: 6 },
  historyClearText: { color: '#555', fontSize: 14 },
  catList: { paddingHorizontal: 12, marginBottom: 12, flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1a1a2e', marginHorizontal: 4, borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipMix: { borderColor: '#534AB7' },
  chipActive: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  chipMixActive: { backgroundColor: '#534AB7' },
  chipText: { color: '#aaa', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  photoGrid: { flex: 1 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12, },
  gridEmpty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  gridEmptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  gridEmptySub: { color: '#7a7a90', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  gridEmptyCta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#1a1a2e', borderRadius: 24, borderWidth: 1, borderColor: '#2a2a4e' },
  gridEmptyCtaText: { color: '#FFD700', fontSize: 14, fontWeight: '700' },
  row: { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  photoCard: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photo: { width: IMG_SIZE, height: IMG_SIZE * 1.5, borderRadius: 12 },
  modalBg: { flex: 1, backgroundColor: '#000' },
  fullImage: { width: width, height: height },
  heartOverlay: { position: 'absolute', alignSelf: 'center', top: height / 2 - 90, zIndex: 99 },
  logoBlessingPopup: { position: 'absolute', top: height / 2 - 80, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  logoBlessingInner: { alignItems: 'center', gap: 12, width: width - 64 },
  logoBlessingText: { color: '#fff', fontSize: 20, fontWeight: '700', fontStyle: 'italic', lineHeight: 26, textAlign: 'center', width: width - 64, textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  closeTop: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeTopText: { color: '#fff', fontSize: 16 },
  authorRow: { position: 'absolute', top: 50, left: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.55)', padding: 8, borderRadius: 14 },
  authorInfoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  authorInfoCard: { width: '100%', maxWidth: 360, backgroundColor: '#15152a', borderRadius: 22, padding: 22, borderWidth: 1, borderColor: '#2a2a4e', shadowColor: '#534AB7', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  authorInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  authorInfoAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: '#2a2a4e' },
  authorInfoName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  authorInfoHandle: { color: '#7F77DD', fontSize: 12, marginTop: 2 },
  authorInfoDesc: { color: '#aaa', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  authorInfoActions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  authorInfoLink: { flex: 1, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(127,119,221,0.15)', borderWidth: 1, borderColor: '#534AB7', alignItems: 'center' },
  authorInfoLinkText: { color: '#AFA9EC', fontSize: 12, fontWeight: '700' },
  authorInfoClose: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#534AB7' },
  authorInfoCloseText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  authorAvatar: { width: 36, height: 36, borderRadius: 18 },
  authorName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  authorUsername: { color: '#aaa', fontSize: 11 },
  modalButtons: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  modalBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBtnActive: { backgroundColor: 'rgba(83,74,183,0.8)', borderColor: '#534AB7' },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  iconBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
});