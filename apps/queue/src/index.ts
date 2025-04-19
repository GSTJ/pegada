import { config } from "@/shared/config";

import "./queues/ProcessImageQueue";
import "./queues/push/CheckPushNotificationReceiptsQueue";
import "./queues/push/SendPushNotificationQueue";
import "./queues/MailQueue";

import fastifyProxy from "@fastify/http-proxy";
import fastify from "fastify";
import undici from "undici";

const app = fastify();

// Redirect every request to https://www.pegada.app/api/*
// This is for retro-compatibility with old clients
app.register(fastifyProxy, {
  upstream: "https://www.pegada.app/api",
  // Bun workaround
  undici: new undici.Agent() as any
});

app.listen({
  port: config.QUEUE_DEV_PORT ?? config.PORT,
  host: "0.0.0.0"
});

// eslint-disable-next-line no-console
console.log("🚀 Temporary server proxy started");
