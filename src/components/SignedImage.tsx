import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface SignedImageProps {
  photoUrl: string;
  alt: string;
  className?: string;
}

export default function SignedImage({ photoUrl, alt, className = '' }: SignedImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        // Extract the path from the full URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/report-photos/user-id/filename.jpg
        const urlParts = photoUrl.split('/storage/v1/object/public/');
        if (urlParts.length < 2) {
          // Try with /storage/v1/object/sign/ format
          const signParts = photoUrl.split('/storage/v1/object/sign/');
          if (signParts.length >= 2) {
            // Already a signed URL
            setSignedUrl(photoUrl);
            setLoading(false);
            return;
          }
          setError(true);
          setLoading(false);
          return;
        }

        const pathWithBucket = urlParts[1];
        const [bucket, ...pathParts] = pathWithBucket.split('/');
        const filePath = pathParts.join('/');

        // Create a signed URL (valid for 1 hour)
        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600);

        if (signError || !data?.signedUrl) {
          console.error('Error creating signed URL:', signError);
          setError(true);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error processing photo URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [photoUrl]);

  if (loading) {
    return <Skeleton className={`w-full h-64 ${className}`} />;
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg h-64 ${className}`}>
        <p className="text-muted-foreground text-sm">Impossible de charger l'image</p>
      </div>
    );
  }

  return (
    <img 
      src={signedUrl} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
    />
  );
}
