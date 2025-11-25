import { useState, useMemo, type ReactNode } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  icon?: ReactNode; // Optional icon/prefix content
  suffix?: ReactNode; // Optional suffix content
  disabled?: boolean;
}

interface DropdownProps<T = string> {
  value?: T;
  onChange: (value: T, option: DropdownOption<T>) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  emptyMessage?: string;
  renderTrigger?: (selectedOption: DropdownOption<T> | null, placeholder: string) => ReactNode;
  renderOption?: (option: DropdownOption<T>, isSelected: boolean) => ReactNode;
}

/**
 * Generic Dropdown component using Radix UI Popover
 *
 * @example
 * ```tsx
 * const options = [
 *   { value: 'us', label: 'United States', icon: <Flag /> },
 *   { value: 'uk', label: 'United Kingdom', icon: <Flag /> },
 * ];
 *
 * <Dropdown
 *   value={selectedValue}
 *   onChange={(value, option) => setSelectedValue(value)}
 *   options={options}
 *   placeholder="Select an option"
 * />
 * ```
 */
function Dropdown<T = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  error,
  emptyMessage = 'No options found.',
  renderTrigger,
  renderOption,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);

  // Get selected option object
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null) return null;
    return options.find((opt) => opt.value === value) || null;
  }, [value, options]);

  const handleSelectOption = (option: DropdownOption<T>) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setOpen(false);
  };

  // Default trigger render
  const defaultRenderTrigger = (
    selected: DropdownOption<T> | null,
    placeholderText: string
  ) => {
    if (selected) {
      return (
        <div className="unjam-flex unjam-items-center unjam-gap-3">
          {selected.icon && (
            <div className="unjam-flex-shrink-0">{selected.icon}</div>
          )}
          <span className="unjam-text-gray-900">{selected.label}</span>
          {selected.suffix && (
            <div className="unjam-flex-shrink-0 unjam-ml-auto">{selected.suffix}</div>
          )}
        </div>
      );
    }
    return <span className="unjam-text-gray-500">{placeholderText}</span>;
  };

  // Default option render
  const defaultRenderOption = (
    option: DropdownOption<T>,
    isSelected: boolean
  ) => {
    return (
      <>
        <Check
          className={`unjam-mr-2 unjam-h-4 unjam-w-4 unjam-text-blue-600 ${
            isSelected ? 'unjam-opacity-100' : 'unjam-opacity-0'
          }`}
        />
        {option.icon && (
          <div className="unjam-flex-shrink-0 unjam-mr-2">{option.icon}</div>
        )}
        <span className="unjam-flex-1 unjam-text-black">{option.label}</span>
        {option.suffix && (
          <div className="unjam-flex-shrink-0 unjam-ml-2">{option.suffix}</div>
        )}
      </>
    );
  };

  const triggerRenderer = renderTrigger || defaultRenderTrigger;
  const optionRenderer = renderOption || defaultRenderOption;

  return (
    <div className="unjam-relative">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`unjam-w-full unjam-flex unjam-items-center unjam-justify-between unjam-px-4 unjam-py-3 unjam-border unjam-rounded-md unjam-bg-white unjam-text-left focus:unjam-outline-none focus:unjam-ring-2 focus:unjam-ring-blue-500 focus:unjam-border-blue-500 ${
              error
                ? 'unjam-border-red-500'
                : 'unjam-border-gray-300'
            } ${
              disabled
                ? 'unjam-bg-gray-100 unjam-cursor-not-allowed'
                : 'hover:unjam-border-gray-400 unjam-cursor-pointer'
            }`}
          >
            {triggerRenderer(selectedOption, placeholder)}
            <ChevronsUpDown className="unjam-h-4 unjam-w-4 unjam-text-gray-400 unjam-ml-2 unjam-flex-shrink-0" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="unjam-w-[--radix-popover-trigger-width] unjam-p-0 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md unjam-shadow-lg unjam-z-50"
            align="start"
            sideOffset={4}
          >
            <div className="unjam-max-h-[300px] unjam-overflow-y-auto unjam-overflow-x-hidden unjam-py-1">
              {options.length === 0 ? (
                <div className="unjam-py-6 unjam-text-center unjam-text-sm unjam-text-gray-500">
                  {emptyMessage}
                </div>
              ) : (
                options.map((option, index) => {
                  const isSelected = value === option.value;

                  return (
                    <button
                      key={`${option.value}-${index}`}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelectOption(option)}
                      className={`unjam-w-full unjam-relative unjam-flex unjam-cursor-pointer unjam-select-none unjam-items-center unjam-px-2 unjam-py-3 unjam-text-sm unjam-text-left unjam-outline-none unjam-transition-colors hover:unjam-bg-gray-100 ${
                        option.disabled
                          ? 'unjam-opacity-50 unjam-cursor-not-allowed'
                          : ''
                      }`}
                    >
                      {optionRenderer(option, isSelected)}
                    </button>
                  );
                })
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Error Message */}
      {error && (
        <p className="unjam-mt-1 unjam-text-sm unjam-text-red-600">{error}</p>
      )}

      {/* Required Indicator */}
      {required && !value && (
        <p className="unjam-mt-1 unjam-text-sm unjam-text-gray-500">Required</p>
      )}
    </div>
  );
}

export default Dropdown;
