import React from "react";
import { StyleSheet, Text, View, Linking } from "react-native";
import { useColors } from "@/hooks/useColors";

interface FooterProps {
  style?: any;
}

const FOOTER_LINKS = [
  { id: "surya", label: "Surya", url: "https://www.linkedin.com/in/g-surya-prakash-0844a1317/" },
  { id: "pranay", label: "Pranay", url: "https://www.linkedin.com/in/pranay-p-12115b296?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" },
  { id: "sriraj", label: "Sri Raj", url: "https://www.linkedin.com/in/sri-raj-kumar-118545331/" },
];

export function Footer({ style }: FooterProps) {
  const colors = useColors();

  return (
    <View style={[styles.footer, style]}>
      <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
        Made with <Text style={{ color: "#ef4444" }}>❤️</Text> by{" "}
        {FOOTER_LINKS.map((link, index) => (
          <React.Fragment key={link.id}>
            <Text
              style={[styles.link, { color: colors.primary }]}
              onPress={() => Linking.openURL(link.url)}
            >
              {link.label}
            </Text>
            {index < FOOTER_LINKS.length - 1 && (
              index === FOOTER_LINKS.length - 2 ? " & " : ", "
            )}
          </React.Fragment>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: "auto",
    paddingTop: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  link: {
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
