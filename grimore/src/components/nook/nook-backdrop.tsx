import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { LibraryScene, SCENES, type SceneId } from './library-scene';

/** The Nook's background: an illustrated library or the reader's own photo, fading into the page. */
export function NookBackdrop({
  scene,
  backgroundUrl,
  style,
  fade = true,
  children,
}: {
  scene: SceneId | 'custom';
  backgroundUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  fade?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const useCustom = scene === 'custom' && !!backgroundUrl;
  const sceneId: SceneId = scene !== 'custom' && SCENES[scene] ? scene : 'great-hall';

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#1A130D' }, style]}>
      {useCustom ? (
        <Image source={{ uri: backgroundUrl! }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" cachePolicy="memory-disk" transition={250} accessible={false} />
      ) : (
        <LibraryScene id={sceneId} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      )}
      {/* soft vignette for legibility of floating buttons, and a fade into the page */}
      <LinearGradient colors={['rgba(10,6,3,0.45)', 'rgba(10,6,3,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }} />
      {fade ? <LinearGradient colors={['rgba(0,0,0,0)', colors.canvas]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' }} /> : null}
      {children}
    </View>
  );
}
