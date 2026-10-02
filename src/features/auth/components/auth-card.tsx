import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/layout/container";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Container className="flex justify-center py-10 sm:py-16">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
          </CardContent>
        </Card>
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </Container>
  );
}
