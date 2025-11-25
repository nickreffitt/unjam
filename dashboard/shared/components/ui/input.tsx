import * as React from "react"

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ")
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "unjam-flex unjam-h-10 unjam-w-full unjam-rounded-md unjam-border unjam-border-gray-300 unjam-bg-white unjam-px-3 unjam-py-2 unjam-text-sm unjam-ring-offset-white file:unjam-border-0 file:unjam-bg-transparent file:unjam-text-sm file:unjam-font-medium placeholder:unjam-text-gray-500 focus-visible:unjam-outline-none focus-visible:unjam-ring-2 focus-visible:unjam-ring-blue-500 focus-visible:unjam-ring-offset-2 disabled:unjam-cursor-not-allowed disabled:unjam-opacity-50 aria-[invalid=true]:unjam-border-red-500 focus-visible:aria-[invalid=true]:unjam-ring-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
