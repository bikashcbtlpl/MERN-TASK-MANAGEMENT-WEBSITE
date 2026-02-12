const Queue = require("bull");
const Redis = require("ioredis");

const redis = new Redis(); // default localhost:6379

const emailQueue = new Queue("emailQueue", {
  redis: {
    host: "127.0.0.1",
    port: 6379,
  },
});

module.exports = emailQueue;
