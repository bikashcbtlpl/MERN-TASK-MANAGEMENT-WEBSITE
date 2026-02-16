const { Worker } = require("worker_threads");
const path = require("path");

const runCloudinaryWorker = (files) => {
  return new Promise((resolve, reject) => {
    try {
      const workerPath = path.join(
        __dirname,
        "../workers/cloudinaryWorker.js"
      );

      const worker = new Worker(workerPath, {
        workerData: files || {},
      });

      worker.on("message", (data) => {
        if (data?.success) {
          resolve(data);
        } else {
          reject(
            new Error(data?.error || "Cloudinary worker failed")
          );
        }
      });

      worker.on("error", (err) => {
        reject(err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(
            new Error(`Worker stopped unexpectedly with code ${code}`)
          );
        }
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = runCloudinaryWorker;
