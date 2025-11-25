import React from 'react';
import DynamicFormField from '../DynamicFormField/DynamicFormField';
import type { WiseAccountRequirements } from '@common/types';
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@dashboard/shared/components/ui/field';

interface RecipientFormFieldsProps {
  requirements: WiseAccountRequirements;
  formValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors: Record<string, string>;
}

const RecipientFormFields: React.FC<RecipientFormFieldsProps> = ({
  requirements,
  formValues,
  onChange,
  errors
}) => {
  if (!requirements.fields || requirements.fields.length === 0) {
    return (
      <div className="unjam-p-4 unjam-bg-yellow-50 unjam-border unjam-border-yellow-200 unjam-rounded-lg">
        <p className="unjam-text-yellow-800">No form fields available for this currency/country combination.</p>
      </div>
    );
  }

  return (
    <FieldGroup>
      {requirements.fields.map((field, fieldIndex) => {
        const filteredGroup = field.group?.filter((groupItem) => groupItem.key !== 'address.country') || [];

        // Skip rendering this field entirely if all items are filtered out
        if (filteredGroup.length === 0) {
          return null;
        }

        return (
          <FieldSet key={fieldIndex}>
            {field.name && (
              <FieldLegend variant="label">
                {field.name}
              </FieldLegend>
            )}

            <FieldGroup>
              {filteredGroup.map((groupItem, groupIndex) => (
                <DynamicFormField
                  key={`${fieldIndex}-${groupIndex}-${groupItem.key}`}
                  name={field.name}
                  field={groupItem}
                  value={formValues[groupItem.key] || ''}
                  onChange={onChange}
                  error={errors[groupItem.key]}
                />
              ))}
            </FieldGroup>
          </FieldSet>
        );
      })}
    </FieldGroup>
  );
};

export default RecipientFormFields;
