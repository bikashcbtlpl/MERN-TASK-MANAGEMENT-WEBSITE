require("dotenv").config();
const Queue = require("bull");
const Redis = require("ioredis");

const redis = {
  ...(process.env.REDIS_HOST && { host: process.env.REDIS_HOST.trim() }),
  ...(process.env.REDIS_PORT && {
    port: Number(process.env.REDIS_PORT.trim()),
  }),
};

new Redis(redis)
  .on("error", (e) => console.error("[redis] error:", e))
  .on("connect", () => console.log("[redis] connected"));

module.exports = new Queue("emailQueue", { redis }).on("error", (e) =>
  console.error("[queue] error:", e),
);
