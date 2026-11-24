import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedBackground from "./AnimatedBackground";

/** Full-screen wrapper: animated backdrop plus safe-area padding. */
export default function Screen({ children, tint, secondTint }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-ink">
      <AnimatedBackground tint={tint} secondTint={secondTint} />
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {children}
      </View>
    </View>
  );
}
