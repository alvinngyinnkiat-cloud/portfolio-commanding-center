interface ReportingSourceLabelProps {
  source: string;
}

export function ReportingSourceLabel({ source }: ReportingSourceLabelProps) {
  return (
    <p className="text-xs text-slate-500">
      Source: <span className="text-slate-400">{source}</span>
    </p>
  );
}
