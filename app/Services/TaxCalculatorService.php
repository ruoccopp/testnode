<?php

namespace App\Services;

class TaxCalculatorService
{
    // Tax coefficients for different macro categories
    private const TAX_COEFFICIENTS = [
        'FOOD_COMMERCE' => 0.40,
        'STREET_COMMERCE' => 0.40,
        'INTERMEDIARIES' => 0.62,
        'OTHER_ACTIVITIES' => 0.67,
        'PROFESSIONAL' => 0.78,
        'CONSTRUCTION' => 0.86,
    ];

    // INPS contribution rates for 2025
    private const INPS_RATES = [
        'GESTIONE_SEPARATA' => [
            'rate' => 0.2635, // 26.35%
            'minimum' => 4153.84,
            'maximum' => 109544.00,
        ],
        'IVS_ARTIGIANI' => [
            'rate' => 0.2435, // 24.35%
            'minimum' => 4153.84,
            'maximum' => 109544.00,
        ],
        'IVS_COMMERCIANTI' => [
            'rate' => 0.2435, // 24.35%
            'minimum' => 4153.84,
            'maximum' => 109544.00,
        ],
    ];

    public function calculate(array $input): array
    {
        $revenue = $input['revenue'];
        $macroCategory = $input['macroCategory'];
        $isStartup = $input['isStartup'];
        $startDate = $input['startDate'];
        $contributionRegime = $input['contributionRegime'];
        $contributionReduction = $input['contributionReduction'] ?? 'NONE';
        $hasOtherCoverage = $input['hasOtherCoverage'] ?? false;
        $year = $input['year'] ?? date('Y');

        // Calculate taxable income
        $coefficient = self::TAX_COEFFICIENTS[$macroCategory] ?? 0.67;
        $taxableIncome = $revenue * $coefficient;

        // Calculate tax rate (5% for startups in first 5 years, 15% otherwise)
        $taxRate = $this->calculateTaxRate($isStartup, $startDate, $year);

        // Calculate tax amount
        $taxAmount = $taxableIncome * ($taxRate / 100);

        // Calculate INPS contributions
        $inpsAmount = $this->calculateINPS(
            $taxableIncome,
            $contributionRegime,
            $contributionReduction,
            $hasOtherCoverage
        );

        // Calculate total due
        $totalDue = $taxAmount + $inpsAmount;

        return [
            'revenue' => $revenue,
            'taxableIncome' => $taxableIncome,
            'taxRate' => $taxRate,
            'taxAmount' => $taxAmount,
            'inpsAmount' => $inpsAmount,
            'totalDue' => $totalDue,
            'details' => [
                'coefficient' => $coefficient,
                'contributionRegime' => $contributionRegime,
                'contributionReduction' => $contributionReduction,
            ],
        ];
    }

    private function calculateTaxRate(bool $isStartup, string $startDate, int $currentYear): float
    {
        if (!$isStartup) {
            return 15.0;
        }

        $startYear = (int) date('Y', strtotime($startDate));
        $yearsActive = $currentYear - $startYear;

        // 5% tax rate for first 5 years for startups
        return $yearsActive < 5 ? 5.0 : 15.0;
    }

    private function calculateINPS(
        float $taxableIncome,
        string $contributionRegime,
        string $contributionReduction,
        bool $hasOtherCoverage
    ): float {
        $rates = self::INPS_RATES[$contributionRegime] ?? self::INPS_RATES['GESTIONE_SEPARATA'];
        
        $baseAmount = min(max($taxableIncome, $rates['minimum']), $rates['maximum']);
        $contribution = $baseAmount * $rates['rate'];

        // Apply reductions
        $reductionFactor = $this->getReductionFactor($contributionReduction);
        $contribution *= (1 - $reductionFactor);

        // Reduce by 50% if has other pension coverage
        if ($hasOtherCoverage) {
            $contribution *= 0.5;
        }

        return $contribution;
    }

    private function getReductionFactor(string $reduction): float
    {
        return match ($reduction) {
            'REDUCTION_35' => 0.35,
            'REDUCTION_50' => 0.50,
            default => 0.0,
        };
    }
}