import { Language } from "@pegada/shared/i18n/types/types";

import { MailService } from "../../services/mail-service";
import { handleMail } from "./mail";

jest.mock("cloudflare", () => jest.fn());

jest.mock("../../shared/observability", () => ({
  observability: { enabled: false, captureError: jest.fn() },
  getPostHogNode: jest.fn(() => null),
}));

// The plain text part is what lock screens and mail previews show. It went
// out as "Your verification code is: {{code}}" because the code never reached
// the translation.
it("puts the code in the plain text part", async () => {
  const sendMail = jest
    .spyOn(MailService, "sendMail")
    .mockResolvedValue({} as never);

  await handleMail({
    email: "someone@pegada.app",
    code: "123456",
    language: Language.Default,
  });

  expect(sendMail.mock.calls[0]?.[0].text).toContain("123456");
});
