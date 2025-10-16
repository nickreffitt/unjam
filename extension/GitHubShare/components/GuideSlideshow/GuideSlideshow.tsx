import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type GuideSlide } from '@common/types';

interface GuideSlideshowProps {
  slides: GuideSlide[];
  platformName: string;
}

const GuideSlideshow: React.FC<GuideSlideshowProps> = ({ slides, platformName }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePrevious = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
  };

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[currentSlide];

  return (
    <div className="unjam-bg-gray-50 unjam-rounded-lg unjam-p-4 unjam-mb-4">
      {/* Header */}
      <div className="unjam-flex unjam-items-center unjam-justify-between unjam-mb-3">
        <h3 className="unjam-text-sm unjam-font-semibold unjam-text-gray-700">
          {platformName} Guide
        </h3>
        {slides.length > 1 && (
          <div className="unjam-text-xs unjam-text-gray-500">
            {currentSlide + 1} / {slides.length}
          </div>
        )}
      </div>

      {/* Slide Content */}
      <div className="unjam-mb-4">
        <h4 className="unjam-text-base unjam-font-medium unjam-text-gray-800 unjam-mb-2">
          {slide.title}
        </h4>
        <p className="unjam-text-sm unjam-text-gray-600 unjam-mb-3">
          {slide.description}
        </p>

        {/* Steps */}
        <ol className="unjam-list-decimal unjam-list-inside unjam-space-y-1">
          {slide.steps.map((step, index) => (
            <li key={index} className="unjam-text-sm unjam-text-gray-700">
              {step}
            </li>
          ))}
        </ol>

        {/* Optional Image */}
        {slide.image && (
          <div className="unjam-mt-3">
            <img
              src={slide.image}
              alt={slide.title}
              className="unjam-w-full unjam-rounded unjam-border unjam-border-gray-200"
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {slides.length > 1 && (
        <div className="unjam-flex unjam-items-center unjam-justify-between unjam-pt-3 unjam-border-t unjam-border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            className="unjam-flex unjam-items-center unjam-gap-1 unjam-px-3 unjam-py-1.5 unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md hover:unjam-bg-gray-50 unjam-transition-colors disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
            className="unjam-flex unjam-items-center unjam-gap-1 unjam-px-3 unjam-py-1.5 unjam-text-sm unjam-font-medium unjam-text-gray-700 unjam-bg-white unjam-border unjam-border-gray-300 unjam-rounded-md hover:unjam-bg-gray-50 unjam-transition-colors disabled:unjam-opacity-50 disabled:unjam-cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default GuideSlideshow;
