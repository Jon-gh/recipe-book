import Cocotte from "./cocotte/Cocotte";
import { type CocottePose } from "./cocotte/Cocotte";
import Link from "next/link";

type Props = {
  pose: CocottePose;
  title: string;
  subtext?: string;
  action?: { label: string; href?: string; onClick?: () => void };
};

export default function EmptyState({ pose, title, subtext, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Cocotte pose={pose} size={140} />
      <p className="font-bold text-lg">{title}</p>
      {subtext && (
        <p className="text-sm text-muted-foreground max-w-xs">{subtext}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="mt-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
