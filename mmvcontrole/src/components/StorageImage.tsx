import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { urlAssinada } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function StorageImage({
  caminho,
  alt,
  className,
}: {
  caminho?: string | null;
  alt: string;
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["arquivo", caminho],
    queryFn: () => urlAssinada(caminho as string),
    enabled: !!caminho,
    staleTime: 1000 * 60 * 60,
  });

  if (!caminho || !data) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="h-6 w-6" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return <img src={data} alt={alt} loading="lazy" decoding="async" className={cn("object-cover", className)} />;
}
