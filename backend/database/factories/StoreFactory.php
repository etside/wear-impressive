<?php

namespace Database\Factories;

use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Store>
 */
class StoreFactory extends Factory
{
    protected $model = Store::class;

    public function definition(): array
    {
        $handle = 'store-'.Str::lower(Str::random(8));

        return [
            'name' => $this->faker->company(),
            'handle' => $handle,
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => null,
            'country' => 'BD',
            'currency' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'primary_language' => 'both',
            'status' => 'active',
            'plan' => 'free',
            'trial_ends_at' => now()->addDays(14),
            'onboarding_completed' => false,
        ];
    }

    public function suspended(): self
    {
        return $this->state(fn () => ['status' => 'suspended']);
    }
}
