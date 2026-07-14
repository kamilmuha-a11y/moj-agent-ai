import { useCallback, useState } from "react";

export type AttachedImage = {
  mediaType: string;
  url: string;
  filename?: string;
};

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024;

export function useImageAttachment() {
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const readFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Nieobsługiwany format. Użyj PNG, JPG, GIF lub WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Max 4MB. Zrób screenshot fragmentu.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setImage({
        mediaType: file.type,
        url: reader.result as string,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith("image/"),
      );
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        readFile(file);
      }
    },
    [readFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
      e.target.value = "";
    },
    [readFile],
  );

  const clear = useCallback(() => {
    setImage(null);
    setError("");
  }, []);

  return {
    image,
    error,
    isDragging,
    readFile,
    handlePaste,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileInput,
    clear,
  };
}
