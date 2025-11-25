import React from 'react';
import Dropdown, { DropdownOption } from '@dashboard/shared/components/Dropdown/Dropdown';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@dashboard/shared/components/ui/field';
import { Input } from '@dashboard/shared/components/ui/input';

interface FieldSpec {
  key: string;
  type: string;
  required: boolean;
  displayFormat?: string;
  example?: string;
  minLength?: number;
  maxLength?: number;
  validationRegexp?: string;
  validationAsync?: string;
  refreshRequirementsOnChange?: boolean;
  valuesAllowed?: Array<{
    key: string;
    name: string;
  }>;
}

interface DynamicFormFieldProps {
  name: string;
  field: FieldSpec;
  value: string;
  onChange: (key: string, value: string) => void;
  error?: string;
}

const DynamicFormField: React.FC<DynamicFormFieldProps> = ({ name, field, value, onChange, error }) => {
  const { key, type, required, example, minLength, maxLength, valuesAllowed } = field;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(key, e.target.value);
  };

  const getHelpText = () => {
    const helpTexts: string[] = [];

    if (example) {
      helpTexts.push(`Example: ${example}`);
    }

    if (minLength || maxLength) {
      if (minLength && maxLength) {
        helpTexts.push(`Length: ${minLength}-${maxLength} characters`);
      } else if (minLength) {
        helpTexts.push(`Min length: ${minLength} characters`);
      } else if (maxLength) {
        helpTexts.push(`Max length: ${maxLength} characters`);
      }
    }

    return helpTexts.length > 0 ? helpTexts.join(' • ') : null;
  };

  const helpText = getHelpText();

  // Render select dropdown if valuesAllowed is provided
  if (valuesAllowed && valuesAllowed.length > 0) {
    const dropdownOptions: DropdownOption[] = valuesAllowed.map(option => ({
      value: option.key,
      label: option.name,
    }));

    return (
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={key}>
          {name}
          {required && <span className="unjam-text-red-500 unjam-ml-1">*</span>}
        </FieldLabel>
        <Dropdown
          value={value}
          onChange={(selectedValue) => onChange(key, selectedValue)}
          options={dropdownOptions}
          placeholder={`Select ${name}`}
          required={required}
          error={error}
        />
        {helpText && <FieldDescription>{helpText}</FieldDescription>}
      </Field>
    );
  }

  // Render text input for all other types
  // Map Wise types to HTML input types
  let inputType = 'text';
  if (type === 'date') {
    inputType = 'date';
  } else if (type === 'email') {
    inputType = 'email';
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={key}>
        {name}
        {required && <span className="unjam-text-red-500 unjam-ml-1">*</span>}
      </FieldLabel>
      <Input
        id={key}
        type={inputType}
        value={value}
        onChange={handleChange}
        required={required}
        placeholder={example || ''}
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={!!error}
      />
      {helpText && <FieldDescription>{helpText}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
};

export default DynamicFormField;
