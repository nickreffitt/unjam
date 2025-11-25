import React, { useMemo } from 'react';
import { CircleFlag } from 'react-circle-flags';
import { countries } from 'country-data-list';
import Dropdown, { type DropdownOption } from '@dashboard/shared/components/Dropdown/Dropdown';

interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

interface CountryDropdownProps {
  value?: string; // ISO country code
  onChange: (countryCode: string, country: Country) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  allowedCountries?: string[]; // ISO country codes to filter by
}

/**
 * CountryDropdown component for selecting countries
 * Uses the generic Dropdown component with country flag icons
 */
const CountryDropdown: React.FC<CountryDropdownProps> = ({
  value,
  onChange,
  placeholder = 'Select your country',
  disabled = false,
  required = false,
  error,
  allowedCountries,
}) => {
  // Get all countries from country-data-list
  const allCountries = useMemo(() => {
    const filteredCountries = (countries.all as Country[])
      .filter((country) => country.status === 'assigned') // Filter out deleted/reserved codes
      .filter((country) => {
        // If allowedCountries is provided, filter by those country codes
        if (allowedCountries && allowedCountries.length > 0) {
          return allowedCountries.includes(country.alpha2);
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return filteredCountries;
  }, [allowedCountries]);

  // Convert countries to dropdown options
  const countryOptions: DropdownOption<string>[] = useMemo(() => {
    return allCountries.map((country) => ({
      value: country.alpha2,
      label: country.name,
      icon: (
        <div className="unjam-w-5 unjam-h-5">
          <CircleFlag
            countryCode={country.alpha2.toLowerCase()}
            height="20"
            width="20"
          />
        </div>
      ),
      suffix: (
        <span className="unjam-text-black unjam-text-xs">
          {country.alpha2}
        </span>
      ),
    }));
  }, [allCountries]);

  const handleChange = (countryCode: string, option: DropdownOption<string>) => {
    const country = allCountries.find((c) => c.alpha2 === countryCode);
    if (country) {
      onChange(countryCode, country);
    }
  };

  return (
    <Dropdown
      value={value}
      onChange={handleChange}
      options={countryOptions}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      emptyMessage="No country found."
    />
  );
};

export default CountryDropdown;
