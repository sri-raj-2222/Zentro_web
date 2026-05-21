import React, { useEffect } from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export function BikeIllustration({ isPicked, color = "#8b5cf6" }: { isPicked?: boolean, color?: string }) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isPicked) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
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
      <Circle cx="5.5" cy="17.5" r="3.5" />
      <Circle cx="18.5" cy="17.5" r="3.5" />
      <Path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <Path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </AnimatedSvg>
  );
}
