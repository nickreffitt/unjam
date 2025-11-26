import React from 'react';
import { Check } from 'lucide-react';
import type { ProductInfo } from '@common/types';

interface PricingCardProps {
  product: ProductInfo;
  onPurchase: (priceId: string) => void;
  isProcessing: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ product, onPurchase, isProcessing }) => {
  const handlePurchase = () => {
    onPurchase(product.priceId);
  };

  // Format price in dollars
  const formattedPrice = (product.price / 100).toFixed(0);

  // Format credit value in dollars
  const formattedCreditValue = (product.creditPrice / 100).toFixed(2);

  return (
    <div className={`unjam-flex unjam-flex-col unjam-h-full unjam-bg-white unjam-rounded-2xl unjam-shadow-sm ${product.isMostPopular ? 'unjam-p-8 unjam-pt-12' : 'unjam-p-8'} hover:unjam-shadow-md unjam-transition-shadow unjam-relative ${
      product.isMostPopular
        ? 'unjam-border-2 unjam-border-blue-600 unjam-shadow-lg'
        : 'unjam-border unjam-border-gray-200'
    }`}>
      {/* Most Popular Badge */}
      {product.isMostPopular && (
        <div className="unjam-absolute unjam-top-0 unjam-left-1/2 unjam-transform -unjam-translate-x-1/2 -unjam-translate-y-1/2">
          <div className="unjam-bg-blue-600 unjam-text-white unjam-text-xs unjam-font-bold unjam-px-4 unjam-py-1 unjam-rounded-full">
            MOST POPULAR
          </div>
        </div>
      )}

      {/* Header */}
      <div className="unjam-mb-6">
        <h3 className="unjam-text-xl unjam-font-semibold unjam-text-gray-900 unjam-mb-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="unjam-text-sm unjam-text-gray-600">
            {product.description}
          </p>
        )}
      </div>

      {/* Pricing */}
      <div className="unjam-mb-6">
        <div className="unjam-flex unjam-items-baseline unjam-gap-1">
          <span className="unjam-text-5xl unjam-font-bold unjam-text-gray-900">
            ${formattedPrice}
          </span>
          <span className="unjam-text-base unjam-text-gray-600">
            / {product.currency.toUpperCase()}
          </span>
        </div>
        <p className="unjam-text-sm unjam-text-gray-600 unjam-mt-2">
          ${formattedCreditValue} in credits
        </p>
      </div>

      {/* Features */}
      {product.marketingFeatures.length > 0 && (
        <ul className="unjam-space-y-3 unjam-mb-8 unjam-flex-grow">
          {product.marketingFeatures.map((feature, index) => (
            <li key={index} className="unjam-flex unjam-items-start unjam-gap-3">
              <Check className="unjam-w-5 unjam-h-5 unjam-text-green-600 unjam-flex-shrink-0 unjam-mt-0.5" />
              <span className="unjam-text-sm unjam-text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={isProcessing}
        className="unjam-w-full unjam-px-6 unjam-py-3 unjam-bg-blue-600 unjam-text-white unjam-rounded-lg unjam-font-semibold hover:unjam-bg-blue-700 disabled:unjam-bg-gray-400 disabled:unjam-cursor-not-allowed unjam-transition-colors"
      >
        {isProcessing ? 'Processing...' : 'Buy Now'}
      </button>
    </div>
  );
};

export default PricingCard;
