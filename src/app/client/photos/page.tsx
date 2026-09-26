import { redirect } from "next/navigation";
import { PhotoUpload } from "@/components/client/photo-upload";
import { getCurrentClient, getProgressPhotos } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Camera } from "lucide-react";
import { copy, fill } from "@/lib/copy";

const t = copy.client.photos;

export default async function PhotosPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const photos = await getProgressPhotos(client.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white px-5 pt-12 pb-5 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t.subtitle}</p>
      </div>

      <div className="px-4 py-5">
        <PhotoUpload clientId={client.id} />

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                {photo.url ? (
                  // Signed URLs expire hourly, so a plain <img> beats next/image caching here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={fill(t.photoAlt, { date: formatDate(photo.date) })}
                    className="bg-slate-200 aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="bg-slate-200 aspect-[3/4] flex items-center justify-center">
                    <Camera size={28} className="text-slate-400" />
                  </div>
                )}
                <div className="bg-white px-3 py-2">
                  <p className="text-xs text-slate-400">{formatDate(photo.date)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500 py-6">{t.empty}</p>
        )}

        <p className="text-center text-xs text-slate-400 mt-5">{t.privacy}</p>
      </div>
    </div>
  );
}
