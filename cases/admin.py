from django.contrib import admin
from .models import Case, CaseLog, ChainOfCustody

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display  = ["crime_number", "section_of_law", "current_stage", "branch", "case_holding_officer"]
    list_filter   = ["current_stage", "branch"]
    search_fields = ["crime_number", "section_of_law", "complainant_name"]

    def has_delete_permission(self, request, obj=None):
        return False  # Cases cannot be deleted


@admin.register(CaseLog)
class CaseLogAdmin(admin.ModelAdmin):
    list_display  = ["crime_number", "field_changed", "old_value", "new_value", "updated_by", "timestamp", "blockchain_tx"]
    list_filter   = ["field_changed", "branch"]
    search_fields = ["crime_number", "field_changed"]
    readonly_fields = ["case", "field_changed", "old_value", "new_value", "updated_by", "timestamp", "crime_number", "branch", "blockchain_tx", "blockchain_hash", "blockchain_block", "blockchain_url"]

    def has_add_permission(self, request):
        return False  # Cannot create logs manually

    def has_change_permission(self, request, obj=None):
        return False  # Cannot edit logs

    def has_delete_permission(self, request, obj=None):
        return False  # Cannot delete logs


@admin.register(ChainOfCustody)
class ChainOfCustodyAdmin(admin.ModelAdmin):
    list_display  = ["crime_number", "action", "officer_username", "timestamp", "blockchain_tx"]
    list_filter   = ["action", "branch"]
    search_fields = ["crime_number", "officer_username"]
    readonly_fields = ["case", "officer", "officer_username", "officer_role", "officer_branch", "action", "reason", "notes", "field_changed", "old_value", "new_value", "crime_number", "branch", "ip_address", "timestamp", "blockchain_tx", "blockchain_hash", "blockchain_block", "blockchain_url"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
