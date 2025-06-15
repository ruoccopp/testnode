<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxCalculation extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'year',
        'revenue',
        'taxable_income',
        'tax_rate',
        'tax_amount',
        'inps_amount',
        'total_due',
    ];

    protected $casts = [
        'revenue' => 'decimal:2',
        'taxable_income' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'inps_amount' => 'decimal:2',
        'total_due' => 'decimal:2',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}