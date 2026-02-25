import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "../lib/api";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { initLocalDb } from "../lib/offline";

const supabase = createSupabaseClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RootLayout() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: 1 },
    },
  }));

  const [trpcClient] = useState(() => createTRPCClient(accessToken));

  useEffect(() => {
    // Initialize local SQLite database
    initLocalDb();

    // Get session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
