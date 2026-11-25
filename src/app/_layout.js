import "../../global.css";

import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AnimatedSplash, { SPLASH_MS } from "../components/AnimatedSplash";
import { initSound } from "../lib/sound";
import useHydrated from "../lib/useHydrated";
import { useGameStore } from "../store/useGameStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Anton_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  useEffect(() => {
    initSound();
  }, []);

  const hydrated = useHydrated();
  const onboarded = useGameStore((s) => s.onboarded);
  // The animated splash plays once per launch, for at least SPLASH_MS.
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#5EB6FF" }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Routes wait for saved progress, so first-run checks see the real state. */}
        {hydrated && (
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
            {/* First launch: the intro screens come before everything else. */}
            <Stack.Protected guard={onboarded} redirectTo="/welcome">
              <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            </Stack.Protected>
            <Stack.Protected guard={!onboarded}>
              <Stack.Screen name="welcome" options={{ animation: "fade" }} />
            </Stack.Protected>
            {/* Swiping back would fight the in-game swipe gestures. */}
            <Stack.Screen name="games/fusion" options={{ gestureEnabled: false }} />
            <Stack.Screen name="games/color-catch" options={{ gestureEnabled: false }} />
          </Stack>
        )}
        <AnimatedSplash done={splashDone && hydrated} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
