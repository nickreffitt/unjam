import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const linkify = (text: string): React.ReactNode[] => {
  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="unjam-underline hover:unjam-no-underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};