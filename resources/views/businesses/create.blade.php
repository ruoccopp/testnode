@extends('layouts.app')

@section('title', 'Nuova Azienda')

@section('content')
<div class="px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
        <h1 class="text-2xl font-semibold text-gray-900">Nuova Azienda</h1>
        <p class="mt-2 text-gray-600">Aggiungi una nuova partita IVA o attività commerciale</p>
    </div>

    <div class="bg-white shadow rounded-lg p-6">
        <form method="POST" action="{{ route('businesses.store') }}">
            @csrf
            
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <!-- Business Name -->
                <div class="sm:col-span-2">
                    <label for="business_name" class="block text-sm font-medium text-gray-700">Nome Azienda *</label>
                    <input type="text" id="business_name" name="business_name" value="{{ old('business_name') }}" required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    @error('business_name')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Macro Category -->
                <div>
                    <label for="macro_category" class="block text-sm font-medium text-gray-700">Categoria Attività *</label>
                    <select id="macro_category" name="macro_category" required
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option value="">Seleziona categoria...</option>
                        <option value="FOOD_COMMERCE" {{ old('macro_category') == 'FOOD_COMMERCE' ? 'selected' : '' }}>Commercio Alimentari</option>
                        <option value="STREET_COMMERCE" {{ old('macro_category') == 'STREET_COMMERCE' ? 'selected' : '' }}>Commercio Ambulante</option>
                        <option value="INTERMEDIARIES" {{ old('macro_category') == 'INTERMEDIARIES' ? 'selected' : '' }}>Intermediari</option>
                        <option value="OTHER_ACTIVITIES" {{ old('macro_category') == 'OTHER_ACTIVITIES' ? 'selected' : '' }}>Altre Attività</option>
                        <option value="PROFESSIONAL" {{ old('macro_category') == 'PROFESSIONAL' ? 'selected' : '' }}>Professionale</option>
                        <option value="CONSTRUCTION" {{ old('macro_category') == 'CONSTRUCTION' ? 'selected' : '' }}>Edilizia</option>
                    </select>
                    @error('macro_category')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- ATECO Code -->
                <div>
                    <label for="ateco_code" class="block text-sm font-medium text-gray-700">Codice ATECO</label>
                    <input type="text" id="ateco_code" name="ateco_code" value="{{ old('ateco_code') }}"
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                           placeholder="es. 62.01.00">
                    @error('ateco_code')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Start Date -->
                <div>
                    <label for="start_date" class="block text-sm font-medium text-gray-700">Data Inizio Attività *</label>
                    <input type="date" id="start_date" name="start_date" value="{{ old('start_date') }}" required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    @error('start_date')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Contribution Regime -->
                <div>
                    <label for="contribution_regime" class="block text-sm font-medium text-gray-700">Regime Contributivo *</label>
                    <select id="contribution_regime" name="contribution_regime" required
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option value="">Seleziona regime...</option>
                        <option value="GESTIONE_SEPARATA" {{ old('contribution_regime') == 'GESTIONE_SEPARATA' ? 'selected' : '' }}>Gestione Separata INPS</option>
                        <option value="IVS_ARTIGIANI" {{ old('contribution_regime') == 'IVS_ARTIGIANI' ? 'selected' : '' }}>IVS Artigiani</option>
                        <option value="IVS_COMMERCIANTI" {{ old('contribution_regime') == 'IVS_COMMERCIANTI' ? 'selected' : '' }}>IVS Commercianti</option>
                    </select>
                    @error('contribution_regime')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Contribution Reduction -->
                <div>
                    <label for="contribution_reduction" class="block text-sm font-medium text-gray-700">Riduzione Contributiva</label>
                    <select id="contribution_reduction" name="contribution_reduction"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option value="NONE" {{ old('contribution_reduction') == 'NONE' ? 'selected' : '' }}>Nessuna</option>
                        <option value="REDUCTION_35" {{ old('contribution_reduction') == 'REDUCTION_35' ? 'selected' : '' }}>Riduzione 35%</option>
                        <option value="REDUCTION_50" {{ old('contribution_reduction') == 'REDUCTION_50' ? 'selected' : '' }}>Riduzione 50%</option>
                    </select>
                    @error('contribution_reduction')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Current Balance -->
                <div>
                    <label for="current_balance" class="block text-sm font-medium text-gray-700">Saldo Attuale (€)</label>
                    <input type="number" id="current_balance" name="current_balance" step="0.01" min="0" value="{{ old('current_balance', 0) }}"
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    @error('current_balance')
                        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Checkboxes -->
                <div class="sm:col-span-2 space-y-4">
                    <div class="flex items-center">
                        <input id="is_startup" name="is_startup" type="checkbox" value="1" {{ old('is_startup') ? 'checked' : '' }}
                               class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                        <label for="is_startup" class="ml-2 block text-sm text-gray-900">
                            È una startup (aliquota 5% per i primi 5 anni)
                        </label>
                    </div>

                    <div class="flex items-center">
                        <input id="has_other_coverage" name="has_other_coverage" type="checkbox" value="1" {{ old('has_other_coverage') ? 'checked' : '' }}
                               class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                        <label for="has_other_coverage" class="ml-2 block text-sm text-gray-900">
                            Ha altra copertura previdenziale (contributi ridotti del 50%)
                        </label>
                    </div>
                </div>
            </div>

            @if ($errors->any())
                <div class="mt-6 rounded-md bg-red-50 p-4">
                    <div class="flex">
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-red-800">
                                Si sono verificati degli errori:
                            </h3>
                            <div class="mt-2 text-sm text-red-700">
                                <ul class="list-disc pl-5 space-y-1">
                                    @foreach ($errors->all() as $error)
                                        <li>{{ $error }}</li>
                                    @endforeach
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            @endif

            <div class="mt-6 flex items-center justify-end gap-x-6">
                <a href="{{ route('businesses.index') }}" class="text-sm font-semibold leading-6 text-gray-900">Annulla</a>
                <button type="submit" class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    Crea Azienda
                </button>
            </div>
        </form>
    </div>
</div>
@endsection