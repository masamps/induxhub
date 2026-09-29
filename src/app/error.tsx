"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <AlertTriangle aria-hidden className="size-10 text-danger" />
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="max-w-md text-muted-foreground">
        Não conseguimos carregar esta página agora. Tente de novo em instantes.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </Container>
  );
}
