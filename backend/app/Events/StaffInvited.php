<?php

namespace App\Events;

use App\Models\Staff;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StaffInvited
{
    use Dispatchable, SerializesModels;

    public function __construct(public Staff $staff)
    {
    }
}
