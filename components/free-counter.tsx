"use client";

import React, { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import { MAX_FREE_COUNT } from "@/constants";
import { useProModal } from "@/hooks/use-pro-modal";

export default function FreeCounter({
  apiLimitCount = 0,
  isPro = false
}: {
  apiLimitCount: number;
  isPro: boolean;
}) {
  const proModal = useProModal();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPro) {
      router.refresh();
    }
  }, [isPro, router]);

  if (!mounted) return null;

  if (isPro) {
    return (
      <div className="px-3">
        <Card className="bg-white/10 border-0">
          <CardContent className="py-6">
            <div className="text-center text-sm text-white mb-4 space-y-2">
              <p className="text-lg font-semibold">Pro Plan Active</p>
              <p>Unlimited generations available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3">
      <Card className="bg-white/10 border-0">
        <CardContent className="py-6">
          <div className="text-center text-sm text-white mb-4 space-y-2">
            <p>
              {apiLimitCount} / {MAX_FREE_COUNT} Free Generations
            </p>
            <Progress
              className="h-3"
              value={(apiLimitCount / MAX_FREE_COUNT) * 100}
            />
          </div>
          <Button
            onClick={proModal.onOpen}
            variant="premium"
            className="w-full"
          >
            Upgrade <Zap className="w-4 h-4 ml-2 fill-white" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
