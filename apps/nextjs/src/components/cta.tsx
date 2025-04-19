import { StoreButton } from "@/components/store-button";
import { t } from "@/lib/translate";

export const CTA = () => {
  return (
    <div className="self-center lg:self-start lg:min-w-[300px] max-w-[30rem] flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="appearFromBottom text-center lg:text-left text-6xl font-extrabold text-text">
          {t("home.title")}
        </h1>
        <p className="appearFromBottom text-center lg:text-left text-gray-500 text-xl font-light text-text">
          {t("home.description")}
        </p>
      </div>
      <div className="appearFromBottom flex gap-3 flex-col lg:flex-row">
        <StoreButton
          href="https://apps.apple.com/br/app/pegada/id6450865592"
          target="_blank"
        >
          <StoreButton.Icon
            width={20}
            height={20}
            src="/app-store-icon.svg"
            alt="App Store"
          />
          <StoreButton.Text>{t("home.cta.appStore")}</StoreButton.Text>
        </StoreButton>
        <StoreButton
          href="https://play.google.com/store/apps/details?id=app.pegada"
          target="_blank"
        >
          <StoreButton.Icon
            width={24}
            height={24}
            src="/google-play-icon.svg"
            alt="Google Play"
          />
          <StoreButton.Text>{t("home.cta.googlePlay")}</StoreButton.Text>
        </StoreButton>
      </div>
    </div>
  );
};
