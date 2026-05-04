import React, { useEffect } from 'react';
import Svg, { Path, Rect, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export function TankIllustration({ isPicked, color = "#22c55e" }: { isPicked?: boolean, color?: string }) {
  const waterLevelY = useSharedValue(0);

  useEffect(() => {
    if (isPicked) {
      waterLevelY.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      waterLevelY.value = withTiming(0);
    }
  }, [isPicked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: waterLevelY.value }]
  }));

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isPicked ? 1.1 : 1 }]
  }));

  return (
    <AnimatedSvg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={mainStyle}>
      <Rect x="4" y="6" width="16" height="14" rx="2" />
      <Path d="M12 2v4M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" />
      <Animated.View style={[animatedStyle, { position: 'absolute', width: 24, height: 24 }]}>
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6z" fill={isPicked ? color + "20" : "none"} />
        </Svg>
      </Animated.View>
    </AnimatedSvg>
  );
}
