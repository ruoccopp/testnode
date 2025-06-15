@extends('layouts.app')

@section('title', 'Calcolatore Tasse')

@section('content')
<div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
            <h1 class="text-2xl font-semibold text-gray-900">Calcolatore Tasse</h1>
            <p class="mt-2 text-sm text-gray-700">Calcola le tue tasse e contributi per il regime forfettario</p>
        </div>
    </div>

    <div class="mt-8">
        <div class="bg-white shadow rounded-lg p-6">
            <form method="POST" action="{{ route('calculator.calculate') }}">
                @csrf
                
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <!-- Business Selection -->
                    <div>
                        <label for="business_id" class="block text-sm font-medium text-gray-700">Seleziona Azienda</label>
                        <select id="business_id" name="business_id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
                            <option value="">Seleziona un'azienda...</option>
                            @foreach($businesses as $business)
                                <option value="{{ $business->id }}">{{ $business->business_name }}</option>
                            @endforeach
                        </select>
                        @error('business_id')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <!-- Revenue -->
                    <div>
                        <label for="revenue" class="block text-sm font-medium text-gray-700">Fatturato Annuo (€)</label>
                        <input type="number" id="revenue" name="revenue" step="0.01" min="0" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
                        @error('revenue')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <!-- Year -->
                    <div>
                        <label for="year" class="block text-sm font-medium text-gray-700">Anno di Riferimento</label>
                        <select id="year" name="year" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
                            @for($i = 2020; $i <= 2030; $i++)
                                <option value="{{ $i }}" {{ $i == date('Y') ? 'selected' : '' }}>{{ $i }}</option>
                            @endfor
                        </select>
                        @error('year')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>
                </div>

                <div class="mt-6">
                    <button type="submit" class="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Calcola Tasse
                    </button>
                </div>
            </form>
        </div>

        @if($businesses->isEmpty())
            <div class="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-yellow-800">Nessuna azienda trovata</h3>
                        <div class="mt-2 text-sm text-yellow-700">
                            <p>Devi prima creare un'azienda per utilizzare il calcolatore.</p>
                        </div>
                        <div class="mt-4">
                            <a href="{{ route('businesses.create') }}" class="text-sm font-medium text-yellow-800 underline hover:text-yellow-600">
                                Crea la tua prima azienda
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        @endif
    </div>
</div>
@endsection