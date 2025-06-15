<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\TaxCalculation;
use App\Services\TaxCalculatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaxCalculatorController extends Controller
{
    protected $taxCalculatorService;

    public function __construct(TaxCalculatorService $taxCalculatorService)
    {
        $this->taxCalculatorService = $taxCalculatorService;
    }

    public function index()
    {
        $businesses = Auth::user()->businesses;
        return view('calculator.index', compact('businesses'));
    }

    public function calculate(Request $request)
    {
        $request->validate([
            'business_id' => 'required|exists:businesses,id',
            'revenue' => 'required|numeric|min:0',
            'year' => 'required|integer|min:2020|max:2030',
        ]);

        $business = Business::findOrFail($request->business_id);
        
        // Ensure user owns the business
        if ($business->user_id !== Auth::id()) {
            abort(403);
        }

        $calculationData = [
            'revenue' => $request->revenue,
            'macroCategory' => $business->macro_category,
            'isStartup' => $business->is_startup,
            'startDate' => $business->start_date->format('Y-m-d'),
            'contributionRegime' => $business->contribution_regime,
            'contributionReduction' => $business->contribution_reduction ?? 'NONE',
            'hasOtherCoverage' => $business->has_other_coverage,
            'year' => $request->year,
        ];

        $result = $this->taxCalculatorService->calculate($calculationData);

        // Save calculation to database
        $taxCalculation = TaxCalculation::create([
            'business_id' => $business->id,
            'year' => $request->year,
            'revenue' => $result['revenue'],
            'taxable_income' => $result['taxableIncome'],
            'tax_rate' => $result['taxRate'],
            'tax_amount' => $result['taxAmount'],
            'inps_amount' => $result['inpsAmount'],
            'total_due' => $result['totalDue'],
        ]);

        return redirect()->route('calculator.results', $taxCalculation->id);
    }

    public function results($id)
    {
        $calculation = TaxCalculation::with('business')->findOrFail($id);
        
        // Ensure user owns the calculation
        if ($calculation->business->user_id !== Auth::id()) {
            abort(403);
        }

        return view('calculator.results', compact('calculation'));
    }
}