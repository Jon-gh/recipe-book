type Props = {
  emoji: string;
  message: string;
};

export default function LoadingState({ emoji, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="text-5xl animate-pulse">{emoji}</span>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
