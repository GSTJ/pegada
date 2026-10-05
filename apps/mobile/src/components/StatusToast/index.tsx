import { useEffect, useMemo } from "react";
import { AccessibilityInfo, StatusBar, StyleSheet, Text, View } from "react-native";
import { magicToast } from "react-native-magic-toast";
import { useMagicModal } from "react-native-magic-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StatusToastTone = "error" | "success";

const StatusToast = ({
  duration,
  message,
  tone,
}: {
  duration: number;
  message: string;
  tone: StatusToastTone;
}) => {
  const { top } = useSafeAreaInsets();
  const { hide } = useMagicModal();
  const containerStyle = useMemo(() => [styles.container, { paddingTop: 25 + top }], [top]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
    const timeout = setTimeout(() => hide(), duration);
    return () => clearTimeout(timeout);
  }, [duration, hide, message]);

  return (
    <View accessible accessibilityLabel={message} accessibilityRole="alert" style={containerStyle}>
      <StatusBar barStyle="light-content" />
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.icon}
      >
        {tone === "success" ? "✓" : "!"}
      </Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#191919",
    flexDirection: "row",
    gap: 12,
    padding: 25,
  },
  icon: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 24,
    textAlign: "center",
    width: 25,
  },
  message: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontWeight: "bold",
  },
});

export const showStatusToast = (
  message: string,
  tone: StatusToastTone,
  duration = tone === "success" ? 2_000 : 3_000,
) => magicToast.show(() => <StatusToast duration={duration} message={message} tone={tone} />);
