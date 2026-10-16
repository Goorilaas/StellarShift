import { createContext } from 'react';
import { View } from 'react-native';

// Active name and its validation message share one measured container.
export const RenameVisibility = createContext<(field: View | null) => void>(() => {});
