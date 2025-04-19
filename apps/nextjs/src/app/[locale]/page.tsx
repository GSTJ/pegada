import { CTA } from "@/components/cta";
import { HeroImage } from "@/components/hero-image";
import { Logo } from "@/components/logo";
import { Restricter } from "@/components/restricter";
import { t } from "@/lib/translate";

const App = () => {
  return (
    <Restricter>
      <div className="flex flex-1 min-h-screen flex-wrap flex-col lg:flex-row">
        <div className="p-12 flex flex-col flex-1 gap-20 justify-between items-center lg:items-start">
          <Logo />
          <CTA />
          <div className="gap-4 flex flex-col items-center lg:items-start">
            <a
              href="https://www.producthunt.com/posts/pegada?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-pegada"
              target="_blank"
              rel="noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=465930&theme=light"
                alt="Pegada - Find&#0032;a&#0032;Match&#0032;For&#0032;Your&#0032;Dog | Product Hunt"
                className="h-12"
              />
            </a>
            <p className="text-center lg:text-left">
              {t("home.madeWithLoveBy")}
              <a
                href="https://gabrieltaveira.dev"
                target="_blank"
                className="text-blue-500 hover:underline"
                rel="noreferrer"
              >
                <b>Gabriel Taveira</b>
              </a>
            </p>
          </div>
        </div>
        <HeroImage />
      </div>
    </Restricter>
  );
};

export default App;
