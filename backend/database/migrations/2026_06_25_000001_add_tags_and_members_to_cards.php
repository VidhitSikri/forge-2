<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            // tags: JSON array of strings, e.g. ["bug", "urgent", "feature"]
            $table->json('tags')->nullable()->after('due_date');
            // members: JSON array of objects, e.g. [{"name": "Alice", "initials": "AL", "color": "#7c3aed"}]
            $table->json('members')->nullable()->after('tags');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            $table->dropColumn(['tags', 'members']);
        });
    }
};
