import React, { useState } from 'react';
import { CreditCard, Check, Zap } from 'lucide-react';

interface PricingTier {
  id: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  buttonText: string;
}

const BuyCredits: React.FC = () => {
  const pricingTiers: PricingTier[] = [
    {
      id: '5-credits',
      credits: 5,
      price: 35,
      pricePerCredit: 7.00,
      description: 'Perfect for trying out Unjam',
      features: [
        '5 monthly credits',
        'Basic support',
        'Email assistance'
      ],
      buttonText: 'Subscribe to 5 Credits'
    },
    {
      id: '10-credits',
      credits: 10,
      price: 65,
      pricePerCredit: 6.50,
      description: 'Most popular choice',
      features: [
        '10 monthly credits',
        'Priority support',
        'Screen sharing'
      ],
      isPopular: true,
      isCurrent: true,
      buttonText: 'Current Plan'
    },
    {
      id: '25-credits',
      credits: 25,
      price: 150,
      pricePerCredit: 6.00,
      description: 'For serious developers',
      features: [
        '25 monthly credits',
        'Premium support',
        'Advanced debugging',
        'Team features'
      ],
      buttonText: 'Subscribe to 25 Credits'
    }
  ];

  const handleSubscribe = (tierId: string) => {
    // TODO: Implement actual subscription logic
    console.info('Subscribe to:', tierId);
  };

  return (
    <div className="unjam-h-full unjam-overflow-y-auto">
      <div className="unjam-p-4">
        <div className="unjam-max-w-6xl max-lg:unjam-max-w-3xl unjam-mx-auto">
          {/* Header */}
          <div className="unjam-text-center">
            <h2 className="unjam-text-slate-900 unjam-text-3xl unjam-font-bold unjam-mb-4">
              Choose the right plan for you
            </h2>
            <p className="unjam-text-[15px] unjam-text-slate-600">
              Flexible plans designed for your support needs with access to expert engineers.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="unjam-grid lg:unjam-grid-cols-3 sm:unjam-grid-cols-2 unjam-gap-6 unjam-mt-12 max-sm:unjam-max-w-sm max-sm:unjam-mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`unjam-border unjam-shadow-sm unjam-rounded-md unjam-p-6 ${
                  tier.isPopular ? 'unjam-border-blue-600' : 'unjam-border-gray-300'
                }`}
              >
                {/* Tier Header */}
                <h3 className={`unjam-text-slate-900 unjam-text-xl unjam-font-semibold unjam-mb-3 unjam-flex unjam-items-center ${
                  tier.isPopular ? 'unjam-text-blue-600' : ''
                }`}>
                  {tier.credits} Credits
                  {tier.isPopular && (
                    <span className="unjam-px-2 unjam-py-1 unjam-text-xs unjam-font-semibold unjam-text-white unjam-bg-blue-500 unjam-rounded-md unjam-ml-3">
                      Most Popular
                    </span>
                  )}
                  {tier.isCurrent && (
                    <span className="unjam-px-2 unjam-py-1 unjam-text-xs unjam-font-semibold unjam-text-white unjam-bg-gray-500 unjam-rounded-md unjam-ml-3">
                      Current Plan
                    </span>
                  )}
                </h3>
                <p className="unjam-text-[15px] unjam-text-slate-600">{tier.description}</p>

                {/* Price */}
                <div className="unjam-mt-8">
                  <h3 className="unjam-text-slate-900 unjam-text-3xl unjam-font-semibold">
                    ${tier.price}
                    <sub className="unjam-text-slate-600 unjam-text-[15px] unjam-font-normal"> / per month</sub>
                  </h3>
                  <p className="unjam-text-[13px] unjam-text-slate-500 unjam-mt-1">
                    ${tier.pricePerCredit.toFixed(2)} per credit
                  </p>
                </div>

                {/* Features Section */}
                <div className="unjam-mt-6">
                  <h4 className="unjam-text-slate-900 unjam-text-lg unjam-font-semibold unjam-mb-3">Include</h4>
                  <p className="unjam-text-[15px] unjam-text-slate-600">Everything you get in this plan</p>

                  <ul className="unjam-mt-8 unjam-space-y-4">
                    {tier.features.map((feature, index) => (
                      <li key={`${tier.id}-feature-${index}`} className="unjam-flex unjam-items-center unjam-text-[15px] unjam-text-slate-600 unjam-font-medium">
                        <Check className="unjam-w-4 unjam-h-4 unjam-mr-3 unjam-text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe Button */}
                  <button
                    type="button"
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={tier.isCurrent}
                    className={`unjam-w-full unjam-mt-8 unjam-px-4 unjam-py-2.5 unjam-text-[15px] unjam-font-medium unjam-rounded-md unjam-cursor-pointer unjam-transition-colors ${
                      tier.isCurrent
                        ? 'unjam-text-gray-500 unjam-bg-gray-300 unjam-cursor-not-allowed'
                        : 'unjam-text-white unjam-bg-blue-600 hover:unjam-bg-blue-700'
                    }`}
                  >
                    {tier.isCurrent ? tier.buttonText : tier.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="unjam-text-center unjam-mt-12">
            <p className="unjam-text-[15px] unjam-text-slate-600 unjam-mb-4">
              All plans include secure payment processing and instant activation
            </p>
            <div className="unjam-flex unjam-justify-center unjam-items-center unjam-space-x-6 unjam-text-[13px] unjam-text-slate-500">
              <span>• 30-day money back guarantee</span>
              <span>• Cancel anytime</span>
              <span>• No setup fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCredits;