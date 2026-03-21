from rest_framework import serializers
from .models import Case, CaseLog, ChainOfCustody


class CaseSerializer(serializers.ModelSerializer):
    case_holding_officer_username = serializers.CharField(
        source="case_holding_officer.username",
        read_only=True
    )

    class Meta:
        model = Case
        fields = "__all__"
        read_only_fields = [
            "id", "branch",
            "case_holding_officer",
            "case_holding_officer_username",
        ]


class CaseLogSerializer(serializers.ModelSerializer):
    updated_by = serializers.CharField(source="updated_by.username", read_only=True)
    case_id    = serializers.UUIDField(source="case.id", read_only=True)

    class Meta:
        model = CaseLog
        fields = [
            "id", "case_id", "crime_number",
            "field_changed", "old_value", "new_value",
            "updated_by", "branch", "timestamp",
            "blockchain_tx", "blockchain_hash",
            "blockchain_block", "blockchain_url",
        ]


class ChainOfCustodySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChainOfCustody
        fields = [
            "id", "action", "reason", "notes",
            "field_changed", "old_value", "new_value",
            "officer_username", "officer_role", "officer_branch",
            "crime_number", "branch", "ip_address", "timestamp",
        ]
