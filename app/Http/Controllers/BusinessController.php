<?php

namespace App\Http\Controllers;

use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BusinessController extends Controller
{
    public function index()
    {
        $businesses = Auth::user()->businesses;
        return view('businesses.index', compact('businesses'));
    }

    public function create()
    {
        return view('businesses.create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'business_name' => 'required|string|max:255',
            'macro_category' => 'required|in:FOOD_COMMERCE,STREET_COMMERCE,INTERMEDIARIES,OTHER_ACTIVITIES,PROFESSIONAL,CONSTRUCTION',
            'ateco_code' => 'nullable|string|max:10',
            'start_date' => 'required|date',
            'is_startup' => 'boolean',
            'contribution_regime' => 'required|in:GESTIONE_SEPARATA,IVS_ARTIGIANI,IVS_COMMERCIANTI',
            'contribution_reduction' => 'nullable|in:NONE,REDUCTION_35,REDUCTION_50',
            'has_other_coverage' => 'boolean',
            'current_balance' => 'nullable|numeric|min:0',
        ]);

        Auth::user()->businesses()->create($request->all());

        return redirect()->route('businesses.index')->with('success', 'Azienda creata con successo!');
    }

    public function show(Business $business)
    {
        if ($business->user_id !== Auth::id()) {
            abort(403);
        }

        $taxCalculations = $business->taxCalculations()->latest()->take(10)->get();
        return view('businesses.show', compact('business', 'taxCalculations'));
    }

    public function edit(Business $business)
    {
        if ($business->user_id !== Auth::id()) {
            abort(403);
        }

        return view('businesses.edit', compact('business'));
    }

    public function update(Request $request, Business $business)
    {
        if ($business->user_id !== Auth::id()) {
            abort(403);
        }

        $request->validate([
            'business_name' => 'required|string|max:255',
            'macro_category' => 'required|in:FOOD_COMMERCE,STREET_COMMERCE,INTERMEDIARIES,OTHER_ACTIVITIES,PROFESSIONAL,CONSTRUCTION',
            'ateco_code' => 'nullable|string|max:10',
            'start_date' => 'required|date',
            'is_startup' => 'boolean',
            'contribution_regime' => 'required|in:GESTIONE_SEPARATA,IVS_ARTIGIANI,IVS_COMMERCIANTI',
            'contribution_reduction' => 'nullable|in:NONE,REDUCTION_35,REDUCTION_50',
            'has_other_coverage' => 'boolean',
            'current_balance' => 'nullable|numeric|min:0',
        ]);

        $business->update($request->all());

        return redirect()->route('businesses.index')->with('success', 'Azienda aggiornata con successo!');
    }

    public function destroy(Business $business)
    {
        if ($business->user_id !== Auth::id()) {
            abort(403);
        }

        $business->delete();

        return redirect()->route('businesses.index')->with('success', 'Azienda eliminata con successo!');
    }
}