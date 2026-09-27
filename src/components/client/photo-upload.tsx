"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Camera } from "lucide-react";
import { copy } from "@/lib/copy";
import { compressImage } from "@/lib/compress-image";

const t = copy.client.photoUpload;

export function PhotoUpload({ clientId }: { clientId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const supabase = createClient();

    const { blob, ext, contentType } = await compressImage(file);
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(path, blob, { contentType });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("progress_photos").insert({
      client_id: clientId,
      date: new Date().toISOString().slice(0, 10),
      url: path,
    });
    if (insertError) {
      setError(insertError.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
  }

  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center py-8 mb-5">
      <Camera size={28} className="text-blue-400 mb-2" />
      <p className="text-sm font-semibold text-blue-700">{t.title}</p>
      <p className="text-xs text-blue-500 mt-0.5">{t.subtitle}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <Button size="sm" className="mt-3" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? t.uploading : t.choose}
      </Button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
