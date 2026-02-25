import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../web/src/server/routers"; // shared type only

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient(accessToken: string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/api/trpc`,
        transformer: superjson,
        headers() {
          return accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {};
        },
      }),
    ],
  });
}
