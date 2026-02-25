import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2279ea",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          height: Platform.OS === "ios" ? 80 : 60,
          borderTopColor: "#e5e7eb",
        },
        headerStyle: { backgroundColor: "#1b63d7" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "New Lead",
          tabBarLabel: "Leads",
          tabBarIcon: ({ color, size }) => (
            <LeadsIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "My Jobs",
          tabBarLabel: "Jobs",
          tabBarIcon: ({ color, size }) => (
            <JobsIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarLabel: "Tickets",
          tabBarIcon: ({ color, size }) => (
            <TicketsIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarLabel: "More",
          tabBarIcon: ({ color, size }) => (
            <MoreIcon color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple SVG path icons as React Native components
import { Svg, Path, Circle } from "react-native-svg";

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
      <Path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LeadsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
      <Path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function JobsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
      <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TicketsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
      <Path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MoreIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75">
      <Circle cx="12" cy="12" r="1" />
      <Circle cx="19" cy="12" r="1" />
      <Circle cx="5" cy="12" r="1" />
    </Svg>
  );
}
