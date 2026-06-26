<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class CourierGatewayException extends RuntimeException
{
    protected string $courier;

    protected array $context;

    public function __construct(
        string $message,
        string $courier = 'unknown',
        array $context = [],
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $code, $previous);
        $this->courier = $courier;
        $this->context = $context;
    }

    public function courier(): string
    {
        return $this->courier;
    }

    public function context(): array
    {
        return $this->context;
    }
}
