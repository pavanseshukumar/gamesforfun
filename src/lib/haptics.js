import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { useGameStore } from "../store/useGameStore";

const enabled = () => Platform.OS !== "web" && useGameStore.getState().haptics;
const safe = (fn) => () => {
  if (!enabled()) return;
  fn().catch(() => {});
};

export const haptic = {
  tap: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  select: safe(() => Haptics.selectionAsync()),
  success: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
