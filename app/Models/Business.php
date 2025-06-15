<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Business extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'business_name',
        'macro_category',
        'ateco_code',
        'start_date',
        'is_startup',
        'contribution_regime',
        'contribution_reduction',
        'has_other_coverage',
        'current_balance',
    ];

    protected $casts = [
        'start_date' => 'date',
        'is_startup' => 'boolean',
        'has_other_coverage' => 'boolean',
        'current_balance' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function taxCalculations()
    {
        return $this->hasMany(TaxCalculation::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function paymentDeadlines()
    {
        return $this->hasMany(PaymentDeadline::class);
    }
}