import Cocotte from "./cocotte/Cocotte";

type Props = {
  message: string;
};

export default function LoadingState({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Cocotte pose="stir" size={130} />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
