import { VERIFY_CODE_TEMPLATE } from "../../mails/verifyCodeTemplate";
import { MailService } from "../../services/MailService";
import { TranslationService } from "../../services/TranslationService";
import { IMailJobData } from "../topics";

export const handleMail = async ({ code, language, email }: IMailJobData) => {
  const emailHtml = await MailService.compileTemplate({
    template: VERIFY_CODE_TEMPLATE,
    variables: {
      otp: code,
      year: new Date().getFullYear(),
    },
    language,
  });

  await MailService.sendMail({
    to: email,
    html: emailHtml,
    subject: TranslationService.translate("server:mail.verifyCode.subject", {
      lng: language,
    }),
    text: TranslationService.translate("server:mail.verifyCode.text", {
      lng: language,
    }),
  });
};
