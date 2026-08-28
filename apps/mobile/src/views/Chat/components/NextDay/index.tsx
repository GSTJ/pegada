import { View } from "react-native";

import { Language } from "@pegada/shared/i18n/types/types";
import {
  format,
  isSameDay,
  isThisWeek,
  isThisYear,
  isToday,
  isYesterday,
} from "date-fns";
import { enUS, pt } from "date-fns/locale";

import i18n from "@/i18n";

import { DateText, styles } from "./styles";

/**
 * Exported for the unit test that pins each branch against a frozen clock.
 */
export const formatDate = (date: Date) => {
  const currentLanguage = i18n.language;
  const isPtBr = currentLanguage === Language.PtBr;

  if (isToday(date)) {
    return i18n.t("chat.today");
  }
  if (isYesterday(date)) {
    return i18n.t("chat.yesterday");
  }
  if (isThisWeek(date)) {
    return format(date, "eeee", { locale: isPtBr ? pt : enUS });
  }
  if (isThisYear(date)) {
    // No literal `.` after EEE: a period is not an escape in a date-fns
    // pattern, it is a character to print. en-US read "Fri., 31 Jul", and
    // pt-BR — whose own abbreviation already ends in a period — read
    // "sex.., 31 de jul". Each locale punctuates its own abbreviation.
    return format(date, "EEE, d MMM", { locale: isPtBr ? pt : enUS });
  }
  return format(date, "d MMM, yyyy", { locale: isPtBr ? pt : enUS });
};

const Component = ({
  message,
  nextMessage,
}: {
  message: { createdAt: Date };
  nextMessage?: { createdAt: Date };
}) => {
  const currentMessageDate = message?.createdAt;

  if (nextMessage && isSameDay(currentMessageDate, nextMessage?.createdAt)) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/*
        testID, because the separator is the only thing on this screen a test
        can identify it by. Asserting it as loose text let flow 34 pass on a
        chat that had no separator at all: iOS keeps the previous screen of a
        stack in the accessibility tree, so the Messages list underneath — whose
        rows carry dates in the same shape — satisfied the regex while the chat
        on top said "Today".
      */}
      <DateText
        fontSize="xs"
        fontWeight="medium"
        style={styles.dateText}
        testID="chat-day-separator"
      >
        {formatDate(currentMessageDate)}
      </DateText>
    </View>
  );
};

export default Component;
