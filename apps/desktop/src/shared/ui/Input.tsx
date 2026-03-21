import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "input-panel h-10 w-full rounded-[4px] border border-[#D6E0EA] bg-white px-3 py-2 text-sm text-[#1F2D3D] outline-none transition placeholder:text-[#9AA9B8] focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10",
        className,
      )}
      {...props}
    />
  );
}

export default Input;
