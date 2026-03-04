interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  return (
    <span className="tooltip-wrapper" role="button" tabIndex={0} aria-label={text}>
      <span className="tooltip-icon" aria-hidden="true">?</span>
      <span className="tooltip-text" role="tooltip">{text}</span>
    </span>
  );
}
