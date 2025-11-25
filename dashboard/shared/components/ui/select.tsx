import * as React from "react"

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ")
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "unjam-flex unjam-h-10 unjam-w-full unjam-rounded-md unjam-border unjam-border-gray-300 unjam-bg-white unjam-px-3 unjam-py-2 unjam-text-sm unjam-ring-offset-white focus-visible:unjam-outline-none focus-visible:unjam-ring-2 focus-visible:unjam-ring-blue-500 focus-visible:unjam-ring-offset-2 disabled:unjam-cursor-not-allowed disabled:unjam-opacity-50 aria-[invalid=true]:unjam-border-red-500 focus-visible:aria-[invalid=true]:unjam-ring-red-500",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
