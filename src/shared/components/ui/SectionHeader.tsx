interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4 min-w-0">
      <h2 className="break-words text-base font-semibold tracking-tight text-slate-200">
        {title}
      </h2>
      {description && (
        <p className="mt-1 break-words text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}
