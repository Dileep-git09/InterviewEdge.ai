/**
 * uploadImage.js
 *
 * Utility for uploading a profile image to the backend.
 * Previously this file was empty (bug), causing any import of uploadImage to
 * silently receive `undefined` rather than a function.
 *
 * Usage:
 *   import uploadImage from "../utils/uploadImage";
 *   const { imageUrl } = await uploadImage(file, axiosInstance);
 */

import { API_PATHS } from "./apiPaths";

/**
 * Upload a profile picture to /api/upload-image.
 *
 * @param {File}   file           - The image File object from an <input type="file">
 * @param {object} axiosInstance  - Your configured axios instance (with auth header)
 * @returns {Promise<{ imageUrl: string }>}
 */
const uploadImage = async (file, axiosInstance) => {
  if (!file) throw new Error("No file provided for upload.");

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Unsupported image type. Please upload a JPEG, PNG, WEBP, or GIF.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image too large. Maximum size is 2 MB.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await axiosInstance.post(
    API_PATHS.IMAGE.UPLOAD_IMAGE,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return response.data; // expects { imageUrl: "..." }
};

export default uploadImage;
