import { supabase } from "@/lib/supabase";

/**
 * Uploads a file to Supabase Storage and returns its public download URL.
 * 
 * @param file The file to upload
 * @param path The destination path in storage (e.g. 'avatars/user1.jpg')
 * @returns Promise<string> The public download URL
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    // 1. Upload to Supabase Storage in the 'uploads' bucket
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // 2. Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.error("Supabase Storage Upload Error:", error);
    throw new Error(`Falha no upload para o Supabase: ${error.message}`);
  }
}

/**
 * Helper to generate a unique filename given an original filename.
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = originalName.split(".").pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `file_${timestamp}_${random}.${ext}`;
}
