import React from 'react';
import PricingCard from '../PricingCard/PricingCard';
import type { ProductInfo } from '@common/types';

interface CreditsPricingGridProps {
  products: ProductInfo[];
  onPurchase: (priceId: string) => void;
  isProcessing: boolean;
}

const CreditsPricingGrid: React.FC<CreditsPricingGridProps> = ({
  products,
  onPurchase,
  isProcessing
}) => {
  if (products.length === 0) {
    return (
      <div className="unjam-text-center unjam-py-12">
        <p className="unjam-text-gray-600">No credit packages available at this time.</p>
      </div>
    );
  }

  return (
    <div className="unjam-grid unjam-grid-cols-1 md:unjam-grid-cols-2 lg:unjam-grid-cols-3 unjam-gap-8 unjam-max-w-7xl unjam-mx-auto">
      {products.map((product) => (
        <PricingCard
          key={product.id}
          product={product}
          onPurchase={onPurchase}
          isProcessing={isProcessing}
        />
      ))}
    </div>
  );
};

export default CreditsPricingGrid;
