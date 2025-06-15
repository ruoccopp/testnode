@extends('layouts.app')

@section('title', 'Le Tue Aziende')

@section('content')
<div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
            <h1 class="text-2xl font-semibold text-gray-900">Le Tue Aziende</h1>
            <p class="mt-2 text-sm text-gray-700">Gestisci le tue partite IVA e attività commerciali</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <a href="{{ route('businesses.create') }}" class="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                Aggiungi Azienda
            </a>
        </div>
    </div>

    @if($businesses->count() > 0)
    <div class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table class="min-w-full divide-y divide-gray-300">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azienda</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regime</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Inizio</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup</th>
                                <th scope="col" class="relative px-6 py-3"><span class="sr-only">Azioni</span></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white">
                            @foreach($businesses as $business)
                            <tr>
                                <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                    {{ $business->business_name }}
                                    @if($business->ateco_code)
                                        <br><span class="text-xs text-gray-500">ATECO: {{ $business->ateco_code }}</span>
                                    @endif
                                </td>
                                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    @switch($business->macro_category)
                                        @case('FOOD_COMMERCE')
                                            Commercio Alimentari
                                            @break
                                        @case('STREET_COMMERCE')
                                            Commercio Ambulante
                                            @break
                                        @case('INTERMEDIARIES')
                                            Intermediari
                                            @break
                                        @case('OTHER_ACTIVITIES')
                                            Altre Attività
                                            @break
                                        @case('PROFESSIONAL')
                                            Professionale
                                            @break
                                        @case('CONSTRUCTION')
                                            Edilizia
                                            @break
                                        @default
                                            {{ $business->macro_category }}
                                    @endswitch
                                </td>
                                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    @switch($business->contribution_regime)
                                        @case('GESTIONE_SEPARATA')
                                            Gestione Separata
                                            @break
                                        @case('IVS_ARTIGIANI')
                                            IVS Artigiani
                                            @break
                                        @case('IVS_COMMERCIANTI')
                                            IVS Commercianti
                                            @break
                                        @default
                                            {{ $business->contribution_regime }}
                                    @endswitch
                                </td>
                                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    {{ $business->start_date->format('d/m/Y') }}
                                </td>
                                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    @if($business->is_startup)
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Sì
                                        </span>
                                    @else
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            No
                                        </span>
                                    @endif
                                </td>
                                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <a href="{{ route('businesses.show', $business) }}" class="text-blue-600 hover:text-blue-900 mr-4">Visualizza</a>
                                    <a href="{{ route('businesses.edit', $business) }}" class="text-green-600 hover:text-green-900 mr-4">Modifica</a>
                                    <form method="POST" action="{{ route('businesses.destroy', $business) }}" class="inline">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-600 hover:text-red-900" onclick="return confirm('Sei sicuro di voler eliminare questa azienda?')">Elimina</button>
                                    </form>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    @else
    <div class="text-center mt-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nessuna azienda</h3>
        <p class="mt-1 text-sm text-gray-500">Inizia creando la tua prima partita IVA.</p>
        <div class="mt-6">
            <a href="{{ route('businesses.create') }}" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Aggiungi Prima Azienda
            </a>
        </div>
    </div>
    @endif
</div>
@endsection