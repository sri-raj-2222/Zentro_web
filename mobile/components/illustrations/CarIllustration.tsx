import React, { useEffect } from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export function CarIllustration({ isPicked, color = "#0ea5e9" }: { isPicked?: boolean, color?: string }) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isPicked) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      floatY.value = withTiming(0);
    }
  }, [isPicked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: isPicked ? 1.1 : 1 }]
  }));

  return (
    <AnimatedSvg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={animatedStyle}>
      <Path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H8.4c-.35 0-.69.19-.87.5L4 12H1m15 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
      <Path d="M4 12h10l1.5-3H8z" fill={isPicked ? color + "20" : "none"} />
    </AnimatedSvg>
  );
}
