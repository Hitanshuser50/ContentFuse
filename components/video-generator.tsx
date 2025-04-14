'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateVideo = async () => {
    if (!prompt) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate video');
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setVideoUrl(data[0]);
        toast.success('Video generated successfully!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Enter your prompt for video generation..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full"
        />
        <Button
          onClick={generateVideo}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Video'
          )}
        </Button>
      </div>

      {videoUrl && (
        <div className="mt-4">
          <video
            controls
            className="w-full rounded-lg"
            src={videoUrl}
          />
        </div>
      )}
    </Card>
  );
} 