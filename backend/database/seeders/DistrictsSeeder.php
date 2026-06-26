<?php

namespace Database\Seeders;

use App\Models\District;
use Illuminate\Database\Seeder;

class DistrictsSeeder extends Seeder
{
    /**
     * Seed all 64 Bangladesh districts with division mapping.
     *
     * Source: frontend/lib/bangladesh-locations.ts
     */
    public function run(): void
    {
        $districts = [
            // Dhaka division
            ['name' => 'Dhaka', 'bn_name' => 'ঢাকা', 'division' => 'Dhaka'],
            ['name' => 'Faridpur', 'bn_name' => 'ফরিদপুর', 'division' => 'Dhaka'],
            ['name' => 'Gazipur', 'bn_name' => 'গাজীপুর', 'division' => 'Dhaka'],
            ['name' => 'Gopalganj', 'bn_name' => 'গোপালগঞ্জ', 'division' => 'Dhaka'],
            ['name' => 'Kishoreganj', 'bn_name' => 'কিশোরগঞ্জ', 'division' => 'Dhaka'],
            ['name' => 'Madaripur', 'bn_name' => 'মাদারীপুর', 'division' => 'Dhaka'],
            ['name' => 'Manikganj', 'bn_name' => 'মানিকগঞ্জ', 'division' => 'Dhaka'],
            ['name' => 'Munshiganj', 'bn_name' => 'মুন্সিগঞ্জ', 'division' => 'Dhaka'],
            ['name' => 'Narayanganj', 'bn_name' => 'নারায়ণগঞ্জ', 'division' => 'Dhaka'],
            ['name' => 'Narsingdi', 'bn_name' => 'নরসিংদী', 'division' => 'Dhaka'],
            ['name' => 'Rajbari', 'bn_name' => 'রাজবাড়ী', 'division' => 'Dhaka'],
            ['name' => 'Shariatpur', 'bn_name' => 'শরীয়তপুর', 'division' => 'Dhaka'],
            ['name' => 'Tangail', 'bn_name' => 'টাঙ্গাইল', 'division' => 'Dhaka'],

            // Chittagong (Chattogram) division
            ['name' => 'Chattogram', 'bn_name' => 'চট্টগ্রাম', 'division' => 'Chittagong'],
            ['name' => 'Bandarban', 'bn_name' => 'বান্দরবান', 'division' => 'Chittagong'],
            ['name' => 'Brahmanbaria', 'bn_name' => 'ব্রাহ্মণবাড়িয়া', 'division' => 'Chittagong'],
            ['name' => 'Chandpur', 'bn_name' => 'চাঁদপুর', 'division' => 'Chittagong'],
            ['name' => 'Comilla', 'bn_name' => 'কুমিল্লা', 'division' => 'Chittagong'],
            ["name" => "Cox's Bazar", 'bn_name' => "কক্সবাজার", 'division' => 'Chittagong'],
            ['name' => 'Feni', 'bn_name' => 'ফেনী', 'division' => 'Chittagong'],
            ['name' => 'Khagrachhari', 'bn_name' => 'খাগড়াছড়ি', 'division' => 'Chittagong'],
            ['name' => 'Lakshmipur', 'bn_name' => 'লক্ষ্মীপুর', 'division' => 'Chittagong'],
            ['name' => 'Noakhali', 'bn_name' => 'নোয়াখালী', 'division' => 'Chittagong'],
            ['name' => 'Rangamati', 'bn_name' => 'রাঙ্গামাটি', 'division' => 'Chittagong'],

            // Sylhet division
            ['name' => 'Sylhet', 'bn_name' => 'সিলেট', 'division' => 'Sylhet'],
            ['name' => 'Habiganj', 'bn_name' => 'হবিগঞ্জ', 'division' => 'Sylhet'],
            ['name' => 'Moulvibazar', 'bn_name' => 'মৌলভীবাজার', 'division' => 'Sylhet'],
            ['name' => 'Sunamganj', 'bn_name' => 'সুনামগঞ্জ', 'division' => 'Sylhet'],

            // Khulna division
            ['name' => 'Khulna', 'bn_name' => 'খুলনা', 'division' => 'Khulna'],
            ['name' => 'Bagerhat', 'bn_name' => 'বাগেরহাট', 'division' => 'Khulna'],
            ['name' => 'Chuadanga', 'bn_name' => 'চুয়াডাঙ্গা', 'division' => 'Khulna'],
            ['name' => 'Jashore', 'bn_name' => 'যশোর', 'division' => 'Khulna'],
            ['name' => 'Jhenaidah', 'bn_name' => 'ঝিনাইদহ', 'division' => 'Khulna'],
            ['name' => 'Kushtia', 'bn_name' => 'কুষ্টিয়া', 'division' => 'Khulna'],
            ['name' => 'Magura', 'bn_name' => 'মাগুরা', 'division' => 'Khulna'],
            ['name' => 'Meherpur', 'bn_name' => 'মেহেরপুর', 'division' => 'Khulna'],
            ['name' => 'Narail', 'bn_name' => 'নড়াইল', 'division' => 'Khulna'],
            ['name' => 'Satkhira', 'bn_name' => 'সাতক্ষীরা', 'division' => 'Khulna'],

            // Barisal (Barishal) division
            ['name' => 'Barishal', 'bn_name' => 'বরিশাল', 'division' => 'Barisal'],
            ['name' => 'Barguna', 'bn_name' => 'বরগুনা', 'division' => 'Barisal'],
            ['name' => 'Bhola', 'bn_name' => 'ভোলা', 'division' => 'Barisal'],
            ['name' => 'Jhalokati', 'bn_name' => 'ঝালকাঠি', 'division' => 'Barisal'],
            ['name' => 'Patuakhali', 'bn_name' => 'পটুয়াখালী', 'division' => 'Barisal'],
            ['name' => 'Pirojpur', 'bn_name' => 'পিরোজপুর', 'division' => 'Barisal'],

            // Mymensingh division
            ['name' => 'Mymensingh', 'bn_name' => 'ময়মনসিংহ', 'division' => 'Mymensingh'],
            ['name' => 'Jamalpur', 'bn_name' => 'জামালপুর', 'division' => 'Mymensingh'],
            ['name' => 'Netrokona', 'bn_name' => 'নেত্রকোণা', 'division' => 'Mymensingh'],
            ['name' => 'Sherpur', 'bn_name' => 'শেরপুর', 'division' => 'Mymensingh'],

            // Rajshahi division
            ['name' => 'Rajshahi', 'bn_name' => 'রাজশাহী', 'division' => 'Rajshahi'],
            ['name' => 'Bogura', 'bn_name' => 'বগুড়া', 'division' => 'Rajshahi'],
            ['name' => 'Chapainawabganj', 'bn_name' => 'চাঁপাইনবাবগঞ্জ', 'division' => 'Rajshahi'],
            ['name' => 'Joypurhat', 'bn_name' => 'জয়পুরহাট', 'division' => 'Rajshahi'],
            ['name' => 'Naogaon', 'bn_name' => 'নওগাঁ', 'division' => 'Rajshahi'],
            ['name' => 'Natore', 'bn_name' => 'নাটোর', 'division' => 'Rajshahi'],
            ['name' => 'Nawabganj', 'bn_name' => 'নবাবগঞ্জ', 'division' => 'Rajshahi'],
            ['name' => 'Pabna', 'bn_name' => 'পাবনা', 'division' => 'Rajshahi'],
            ['name' => 'Sirajganj', 'bn_name' => 'সিরাজগঞ্জ', 'division' => 'Rajshahi'],

            // Rangpur division
            ['name' => 'Rangpur', 'bn_name' => 'রংপুর', 'division' => 'Rangpur'],
            ['name' => 'Dinajpur', 'bn_name' => 'দিনাজপুর', 'division' => 'Rangpur'],
            ['name' => 'Gaibandha', 'bn_name' => 'গাইবান্ধা', 'division' => 'Rangpur'],
            ['name' => 'Kurigram', 'bn_name' => 'কুড়িগ্রাম', 'division' => 'Rangpur'],
            ['name' => 'Lalmonirhat', 'bn_name' => 'লালমনিরহাট', 'division' => 'Rangpur'],
            ['name' => 'Nilphamari', 'bn_name' => 'নীলফামারী', 'division' => 'Rangpur'],
            ['name' => 'Panchagarh', 'bn_name' => 'পঞ্চগড়', 'division' => 'Rangpur'],
            ['name' => 'Thakurgaon', 'bn_name' => 'ঠাকুরগাঁও', 'division' => 'Rangpur'],
        ];

        foreach ($districts as $index => $row) {
            District::updateOrCreate(
                ['name' => $row['name']],
                [
                    'bn_name' => $row['bn_name'],
                    'division' => $row['division'],
                    'sort_order' => $index,
                ]
            );
        }
    }
}
