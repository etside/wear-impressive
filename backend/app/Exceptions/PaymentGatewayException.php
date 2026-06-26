<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class PaymentGatewayException extends RuntimeException
{
    protected string $gateway;

    protected array $context;

    public function __construct(
        string $message,
        string $gateway = 'unknown',
        array $context = [],
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $code, $previous);
        $this->gateway = $gateway;
        $this->context = $context;
    }

    public function gateway(): string
    {
        return $this->gateway;
    }

    public function context(): array
    {
        return $this->context;
    }
}
