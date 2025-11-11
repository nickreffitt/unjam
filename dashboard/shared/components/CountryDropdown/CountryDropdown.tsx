import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';
import { countries } from 'country-data-list';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';

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
}

/**
 * CountryDropdown component for selecting countries
 * Uses Radix UI Popover and cmdk for Command palette pattern
 * Based on shadcn/ui country dropdown pattern
 */
const CountryDropdown: React.FC<CountryDropdownProps> = ({
  value,
  onChange,
  placeholder = 'Select your country',
  disabled = false,
  required = false,
  error,
}) => {
  const [open, setOpen] = useState(false);

  // Get all countries from country-data-list
  const allCountries = useMemo(() => {
    return (countries.all as Country[])
      .filter((country) => country.status === 'assigned') // Filter out deleted/reserved codes
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Get selected country object
  const selectedCountry = useMemo(() => {
    if (!value) return null;
    return allCountries.find((c) => c.alpha2 === value.toUpperCase());
  }, [value, allCountries]);

  const handleSelectCountry = (country: Country) => {
    onChange(country.alpha2, country);
    setOpen(false);
  };

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
            {selectedCountry ? (
              <div className="unjam-flex unjam-items-center unjam-gap-3">
                <div className="unjam-w-5 unjam-h-5 unjam-flex-shrink-0">
                  <CircleFlag
                    countryCode={selectedCountry.alpha2.toLowerCase()}
                    height="20"
                    width="20"
                  />
                </div>
                <span className="unjam-text-gray-900">{selectedCountry.name}</span>
              </div>
            ) : (
              <span className="unjam-text-gray-500">{placeholder}</span>
            )}
            <ChevronsUpDown className="unjam-h-4 unjam-w-4 unjam-text-gray-400 unjam-ml-2 unjam-flex-shrink-0" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="unjam-w-[--radix-popover-trigger-width] unjam-p-0 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md unjam-shadow-lg unjam-z-50"
            align="start"
            sideOffset={4}
          >
            <Command className="unjam-w-full" shouldFilter={true}>
              <div className="unjam-flex unjam-items-center unjam-border-b unjam-px-3">
                <svg
                  className="unjam-mr-2 unjam-h-4 unjam-w-4 unjam-shrink-0 unjam-opacity-50"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Command.Input
                  placeholder="Search countries..."
                  className="unjam-flex unjam-h-11 unjam-w-full unjam-rounded-md unjam-bg-transparent unjam-py-3 unjam-text-sm unjam-outline-none placeholder:unjam-text-gray-500 disabled:unjam-cursor-not-allowed disabled:unjam-opacity-50"
                />
              </div>
              <Command.List className="unjam-max-h-[300px] unjam-overflow-y-auto unjam-overflow-x-hidden">
                <Command.Empty className="unjam-py-6 unjam-text-center unjam-text-sm unjam-text-gray-500">
                  No country found.
                </Command.Empty>
                <Command.Group>
                  {allCountries.map((country) => (
                    <Command.Item
                      key={country.alpha2}
                      value={country.name}
                      keywords={[country.alpha2, country.alpha3]}
                      onSelect={(value) => {
                        const selected = allCountries.find(c => c.name === value);
                        if (selected) {
                          handleSelectCountry(selected);
                        }
                      }}
                      onClick={() => handleSelectCountry(country)}
                      className="unjam-relative unjam-flex unjam-cursor-pointer unjam-select-none unjam-items-center unjam-rounded-sm unjam-px-2 unjam-py-1.5 unjam-text-sm unjam-outline-none unjam-transition-colors"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Check
                        className={`unjam-mr-2 unjam-h-4 unjam-w-4 unjam-text-blue-600 ${
                          value === country.alpha2
                            ? 'unjam-opacity-100'
                            : 'unjam-opacity-0'
                        }`}
                      />
                      <div className="unjam-w-5 unjam-h-5 unjam-flex-shrink-0 unjam-mr-2">
                        <CircleFlag
                          countryCode={country.alpha2.toLowerCase()}
                          height="20"
                          width="20"
                        />
                      </div>
                      <span className="unjam-flex-1 unjam-text-black">{country.name}</span>
                      <span className="unjam-text-black unjam-text-xs unjam-ml-2">
                        {country.alpha2}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
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
};

export default CountryDropdown;
