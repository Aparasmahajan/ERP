/**
 * Cloudinary Image Storage Service
 *
 * Replaces local file storage with Cloudinary for soft launch
 * Required env vars:
 *   - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   - CLOUDINARY_API_KEY
 *   - CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadResponse {
  url: string;
  publicId: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Upload image to Cloudinary
 */
export async function uploadImage(
  file: Buffer,
  fileName: string,
  tenantId: string,
  folder: string = 'erp'
): Promise<UploadResponse> {
  try {
    const publicPath = `${folder}/${tenantId}/${fileName}`;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: publicPath,
          folder: `${folder}/${tenantId}`,
          overwrite: true,
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              size: result.bytes,
            });
          }
        }
      );

      stream.end(file);
    });
  } catch (error) {
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'low' | 'medium' | 'high';
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string {
  const url = cloudinary.url(publicId, {
    width: options.width || 400,
    height: options.height,
    quality: options.quality || 'auto',
    fetch_format: options.format || 'auto',
    crop: 'limit',
    secure: true,
  });

  return url;
}

/**
 * Upload base64 image
 */
export async function uploadBase64(
  base64Data: string,
  fileName: string,
  tenantId: string,
  folder: string = 'erp'
): Promise<UploadResponse> {
  try {
    const publicPath = `${folder}/${tenantId}/${fileName}`;

    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
      resource_type: 'auto',
      public_id: publicPath,
      folder: `${folder}/${tenantId}`,
      overwrite: true,
      quality: 'auto',
      fetch_format: 'auto',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
    };
  } catch (error) {
    throw new Error(`Failed to upload base64 image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * List all images in a tenant folder
 */
export async function listTenantImages(tenantId: string, folder: string = 'erp'): Promise<string[]> {
  try {
    const path = `${folder}/${tenantId}`;
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: path,
      max_results: 500,
    });

    return result.resources.map((r: any) => r.secure_url);
  } catch (error) {
    throw new Error(`Failed to list images: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete all images in a tenant folder (use with caution!)
 */
export async function deleteTenantImages(tenantId: string, folder: string = 'erp'): Promise<number> {
  try {
    const path = `${folder}/${tenantId}`;
    const result = await cloudinary.api.delete_resources_by_prefix(path);
    return result.deleted.length;
  } catch (error) {
    throw new Error(`Failed to delete tenant images: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default {
  uploadImage,
  deleteImage,
  getOptimizedUrl,
  uploadBase64,
  listTenantImages,
  deleteTenantImages,
};
