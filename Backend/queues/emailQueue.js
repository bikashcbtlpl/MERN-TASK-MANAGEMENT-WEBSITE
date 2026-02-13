require("dotenv").config();
const Queue = require("bull");
const Redis = require("ioredis");

const redis = new Redis();

const emailQueue = new Queue("emailQueue", {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

module.exports = emailQueue;
