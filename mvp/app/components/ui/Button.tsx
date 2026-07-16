type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

export default function Button({
  children,
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-lg bg-blue-600 px-5 py-3 text-white font-medium transition hover:bg-blue-700 hover:scale-[1.02] active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}