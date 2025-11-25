import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ")
}

// FieldSet
const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    className={cn("unjam-space-y-4", className)}
    {...props}
  />
))
FieldSet.displayName = "FieldSet"

// FieldLegend
const fieldLegendVariants = cva(
  "unjam-font-medium unjam-text-gray-900",
  {
    variants: {
      variant: {
        legend: "unjam-text-lg unjam-mb-2",
        label: "unjam-text-sm unjam-mb-1.5",
      },
    },
    defaultVariants: {
      variant: "legend",
    },
  }
)

interface FieldLegendProps
  extends React.HTMLAttributes<HTMLLegendElement>,
    VariantProps<typeof fieldLegendVariants> {}

const FieldLegend = React.forwardRef<HTMLLegendElement, FieldLegendProps>(
  ({ className, variant, ...props }, ref) => (
    <legend
      ref={ref}
      className={cn(fieldLegendVariants({ variant }), className)}
      {...props}
    />
  )
)
FieldLegend.displayName = "FieldLegend"

// FieldGroup
const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("unjam-space-y-4", className)}
    {...props}
  />
))
FieldGroup.displayName = "FieldGroup"

// Field
interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | "responsive"
  "data-invalid"?: boolean
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = "vertical", "data-invalid": dataInvalid, ...props }, ref) => {
    const orientationClasses = {
      vertical: "unjam-flex unjam-flex-col unjam-gap-1.5",
      horizontal: "unjam-flex unjam-items-start unjam-gap-4",
      responsive: "unjam-flex unjam-flex-col sm:unjam-flex-row sm:unjam-items-start unjam-gap-1.5 sm:unjam-gap-4",
    }

    return (
      <div
        ref={ref}
        role="group"
        data-invalid={dataInvalid}
        className={cn(
          orientationClasses[orientation],
          dataInvalid && "unjam-text-red-600",
          className
        )}
        {...props}
      />
    )
  }
)
Field.displayName = "Field"

// FieldContent
const FieldContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("unjam-flex unjam-flex-col unjam-gap-1.5 unjam-flex-1", className)}
    {...props}
  />
))
FieldContent.displayName = "FieldContent"

// FieldLabel
interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  asChild?: boolean
}

const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, asChild, ...props }, ref) => {
    if (asChild) {
      return <>{props.children}</>
    }

    return (
      <label
        ref={ref}
        className={cn(
          "unjam-text-sm unjam-font-medium unjam-text-gray-900 group-data-[invalid=true]:unjam-text-red-600",
          className
        )}
        {...props}
      />
    )
  }
)
FieldLabel.displayName = "FieldLabel"

// FieldTitle
const FieldTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("unjam-text-sm unjam-font-medium unjam-text-gray-900", className)}
    {...props}
  />
))
FieldTitle.displayName = "FieldTitle"

// FieldDescription
const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("unjam-text-sm unjam-text-gray-500", className)}
    {...props}
  />
))
FieldDescription.displayName = "FieldDescription"

// FieldSeparator
const FieldSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "unjam-border-t unjam-border-gray-200",
      children ? "unjam-flex unjam-items-center unjam-gap-2 unjam-text-sm unjam-text-gray-500" : "",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
FieldSeparator.displayName = "FieldSeparator"

// FieldError
interface FieldErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  errors?: Array<{ message?: string } | undefined>
}

const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(
  ({ className, errors, children, ...props }, ref) => {
    const errorMessages = errors?.filter((e) => e?.message).map((e) => e!.message) || []
    const hasErrors = errorMessages.length > 0 || children

    if (!hasErrors) return null

    return (
      <div
        ref={ref}
        className={cn("unjam-text-sm unjam-text-red-600", className)}
        {...props}
      >
        {errorMessages.length > 1 ? (
          <ul className="unjam-list-disc unjam-list-inside unjam-space-y-1">
            {errorMessages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        ) : errorMessages.length === 1 ? (
          errorMessages[0]
        ) : (
          children
        )}
      </div>
    )
  }
)
FieldError.displayName = "FieldError"

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
}
