<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaxCalculatorController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return view('welcome');
});

// Authentication routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Protected routes
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        return view('dashboard');
    })->name('dashboard');
    
    // Business management
    Route::resource('businesses', BusinessController::class);
    
    // Tax calculator
    Route::get('/calculator', [TaxCalculatorController::class, 'index'])->name('calculator.index');
    Route::post('/calculator', [TaxCalculatorController::class, 'calculate'])->name('calculator.calculate');
    Route::get('/calculator/results/{id}', [TaxCalculatorController::class, 'results'])->name('calculator.results');
});