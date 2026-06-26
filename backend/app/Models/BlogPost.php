<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class BlogPost extends Model
{
    use HasFactory, Searchable, SoftDeletes;

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'store_id' => $this->store_id,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'body' => strip_tags((string) $this->body),
            'tags' => $this->tags,
            'category_id' => $this->category_id,
            'published_at' => $this->published_at?->timestamp,
        ];
    }

    public function shouldBeSearchable(): bool
    {
        return $this->is_published === true;
    }


    protected $guarded = [];

    protected $casts = [
        'tags' => 'array',
        'is_featured' => 'boolean',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'blog_category_id');
    }

    // Author is polymorphic (vendor or staff) via author_type / author_id.
    // We resolve it via a simple accessor instead of morphTo since the
    // author_type column stores short keys ("vendor" | "staff") rather than
    // FQCN values.
    protected function author(): Attribute
    {
        return Attribute::get(function () {
            return match ($this->author_type) {
                'vendor' => Vendor::find($this->author_id),
                'staff' => Staff::find($this->author_id),
                default => null,
            };
        });
    }
}
