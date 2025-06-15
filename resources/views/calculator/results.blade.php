@extends('layouts.app')

@section('title', 'Risultati Calcolo')

@section('content')
<div class="px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
        <h1 class="text-2xl font-semibold text-gray-900">Risultati Calcolo Tasse</h1>
        <p class="mt-2 text-gray-600">{{ $calculation->business->business_name }} - Anno {{ $calculation->year }}</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Summary Cards -->
        <div class="space-y-6">
            <div class="bg-white shadow rounded-lg p-6">
                <h2 class="text-lg font-medium text-gray-900 mb-4">Riepilogo Calcolo</h2>
                
                <dl class="grid grid-cols-1 gap-4">
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">Fatturato Annuo</dt>
                        <dd class="text-sm text-gray-900">€{{ number_format($calculation->revenue, 2) }}</dd>
                    </div>
                    
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">Reddito Imponibile</dt>
                        <dd class="text-sm text-gray-900">€{{ number_format($calculation->taxable_income, 2) }}</dd>
                    </div>
                    
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">Aliquota Fiscale</dt>
                        <dd class="text-sm text-gray-900">{{ $calculation->tax_rate }}%</dd>
                    </div>
                    
                    <div class="border-t pt-4">
                        <div class="flex justify-between">
                            <dt class="text-sm font-medium text-gray-500">Imposta Sostitutiva</dt>
                            <dd class="text-sm text-gray-900">€{{ number_format($calculation->tax_amount, 2) }}</dd>
                        </div>
                        
                        <div class="flex justify-between mt-2">
                            <dt class="text-sm font-medium text-gray-500">Contributi INPS</dt>
                            <dd class="text-sm text-gray-900">€{{ number_format($calculation->inps_amount, 2) }}</dd>
                        </div>
                        
                        <div class="flex justify-between mt-4 pt-4 border-t">
                            <dt class="text-base font-semibold text-gray-900">Totale Dovuto</dt>
                            <dd class="text-base font-semibold text-blue-600">€{{ number_format($calculation->total_due, 2) }}</dd>
                        </div>
                    </div>
                </dl>
            </div>

            <!-- Business Details -->
            <div class="bg-white shadow rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Dettagli Azienda</h3>
                
                <dl class="grid grid-cols-1 gap-4">
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Categoria Attività</dt>
                        <dd class="text-sm text-gray-900">
                            @switch($calculation->business->macro_category)
                                @case('FOOD_COMMERCE')
                                    Commercio Alimentari (Coeff. 40%)
                                    @break
                                @case('STREET_COMMERCE')
                                    Commercio Ambulante (Coeff. 40%)
                                    @break
                                @case('INTERMEDIARIES')
                                    Intermediari (Coeff. 62%)
                                    @break
                                @case('OTHER_ACTIVITIES')
                                    Altre Attività (Coeff. 67%)
                                    @break
                                @case('PROFESSIONAL')
                                    Professionale (Coeff. 78%)
                                    @break
                                @case('CONSTRUCTION')
                                    Edilizia (Coeff. 86%)
                                    @break
                                @default
                                    {{ $calculation->business->macro_category }}
                            @endswitch
                        </dd>
                    </div>
                    
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Regime Contributivo</dt>
                        <dd class="text-sm text-gray-900">
                            @switch($calculation->business->contribution_regime)
                                @case('GESTIONE_SEPARATA')
                                    Gestione Separata INPS
                                    @break
                                @case('IVS_ARTIGIANI')
                                    IVS Artigiani
                                    @break
                                @case('IVS_COMMERCIANTI')
                                    IVS Commercianti
                                    @break
                                @default
                                    {{ $calculation->business->contribution_regime }}
                            @endswitch
                        </dd>
                    </div>
                    
                    @if($calculation->business->is_startup)
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Startup</dt>
                        <dd class="text-sm text-green-600">Sì - Aliquota agevolata 5%</dd>
                    </div>
                    @endif
                    
                    @if($calculation->business->contribution_reduction !== 'NONE')
                    <div>
                        <dt class="text-sm font-medium text-gray-500">Riduzione Contributiva</dt>
                        <dd class="text-sm text-green-600">
                            @switch($calculation->business->contribution_reduction)
                                @case('REDUCTION_35')
                                    35% di riduzione
                                    @break
                                @case('REDUCTION_50')
                                    50% di riduzione
                                    @break
                            @endswitch
                        </dd>
                    </div>
                    @endif
                </dl>
            </div>
        </div>

        <!-- Actions and Export -->
        <div class="space-y-6">
            <!-- Monthly Planning -->
            <div class="bg-white shadow rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Pianificazione Mensile</h3>
                
                <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div class="flex items-center">
                        <svg class="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                        <div>
                            <h4 class="text-sm font-medium text-blue-800">Accantonamento Mensile Consigliato</h4>
                            <p class="text-lg font-semibold text-blue-900">€{{ number_format($calculation->total_due / 12, 2) }}</p>
                            <p class="text-xs text-blue-700">Per coprire le tasse annuali</p>
                        </div>
                    </div>
                </div>

                <div class="mt-4 space-y-3">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Imposta sostitutiva mensile</span>
                        <span class="text-gray-900">€{{ number_format($calculation->tax_amount / 12, 2) }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Contributi INPS mensili</span>
                        <span class="text-gray-900">€{{ number_format($calculation->inps_amount / 12, 2) }}</span>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="bg-white shadow rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Azioni</h3>
                
                <div class="space-y-3">
                    <a href="{{ route('calculator.index') }}" class="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Nuovo Calcolo
                    </a>
                    
                    <a href="{{ route('businesses.show', $calculation->business) }}" class="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Visualizza Azienda
                    </a>
                    
                    <button onclick="window.print()" class="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Stampa Risultati
                    </button>
                </div>
            </div>

            <!-- Tax Calendar -->
            <div class="bg-white shadow rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Scadenze Fiscali {{ $calculation->year }}</h3>
                
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between items-center p-3 bg-yellow-50 rounded-md">
                        <div>
                            <p class="font-medium text-yellow-800">Saldo e primo acconto</p>
                            <p class="text-yellow-600">30 giugno {{ $calculation->year + 1 }}</p>
                        </div>
                        <span class="text-sm font-medium text-yellow-800">€{{ number_format($calculation->total_due * 0.8, 2) }}</span>
                    </div>
                    
                    <div class="flex justify-between items-center p-3 bg-orange-50 rounded-md">
                        <div>
                            <p class="font-medium text-orange-800">Secondo acconto</p>
                            <p class="text-orange-600">30 novembre {{ $calculation->year + 1 }}</p>
                        </div>
                        <span class="text-sm font-medium text-orange-800">€{{ number_format($calculation->total_due * 0.2, 2) }}</span>
                    </div>
                </div>
                
                <div class="mt-4 text-xs text-gray-500">
                    * Le date potrebbero variare in base alle normative vigenti. Consulta sempre il tuo commercialista.
                </div>
            </div>
        </div>
    </div>
</div>

<style>
@media print {
    .no-print { display: none !important; }
    body { background: white !important; }
    .shadow { box-shadow: none !important; }
}
</style>
@endsection