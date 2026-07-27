import zod from "zod-i18n-map/locales/pt/zod.json";

import { Namespace } from "../../types/types";
import breed from "./breed.json";
import mail from "./mail.json";
import server from "./server.json";
import translation from "./translation.json";
import web from "./web.json";

const ptBR = {
  [Namespace.Translation]: translation,
  [Namespace.Breed]: breed,
  [Namespace.Server]: server,
  [Namespace.Mail]: mail,
  [Namespace.Zod]: zod,
  [Namespace.Web]: web,
};

export default ptBR;
