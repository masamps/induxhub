export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  const percent = ((current + 1) / steps.length) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{steps[current]}</span>
        <span className="text-muted-foreground">
          Etapa {current + 1} de {steps.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso do cadastro"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        className="h-2 overflow-hidden rounded-full bg-surface-raised"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
