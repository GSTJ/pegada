import {
  format,
  isSameDay,
  isThisWeek,
  isThisYear,
  isToday,
  isYesterday
} from "date-fns";
import { enUS, pt } from "date-fns/locale";

import { Language } from "@pegada/shared/i18n/types/types";

import i18n from "@/i18n";
import { Container, DateText } from "./styles";

const formatDate = (date: Date) => {
  const currentLanguage = i18n.language;
  const isPtBr = currentLanguage === Language.PtBr;

  if (isToday(date)) {
    return i18n.t("chat.today");
  } else if (isYesterday(date)) {
    return i18n.t("chat.yesterday");
  } else if (isThisWeek(date)) {
    return format(date, "eeee", { locale: isPtBr ? pt : enUS });
  } else if (isThisYear(date)) {
    return format(date, "EEE., d MMM", { locale: isPtBr ? pt : enUS });
  } else {
    return format(date, "d MMM, yyyy", { locale: isPtBr ? pt : enUS });
  }
};

const Component = ({
  message,
  nextMessage
}: {
  message: { createdAt: Date };
  nextMessage?: { createdAt: Date };
}) => {
  const currentMessageDate = message?.createdAt;

  if (nextMessage && isSameDay(currentMessageDate, nextMessage?.createdAt)) {
    return null;
  }

  return (
    <Container>
      <DateText fontSize="xs" fontWeight="medium">
        {formatDate(currentMessageDate)}
      </DateText>
    </Container>
  );
};

export default Component;
