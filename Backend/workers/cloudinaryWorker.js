const { parentPort, workerData } = require("worker_threads");
const cloudinary = require("../config/cloudinary");

const uploadGroup = async (files = [], resourceType = "auto") => {
  const uploaded = [];

  for (const file of files) {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: resourceType,
      folder: "task_uploads",
    });

    uploaded.push(result.secure_url);
  }

  return uploaded;
};

const processUploads = async () => {
  try {
    const files = workerData || {};

    const images = await uploadGroup(files.images, "image");
    const videos = await uploadGroup(files.videos, "video");
    const attachments = await uploadGroup(files.attachments, "raw");

    parentPort.postMessage({
      success: true,
      images,
      videos,
      attachments,
    });

  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message,
    });
  }
};

processUploads();
