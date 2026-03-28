from rest_framework import serializers
from .models import Case, CaseLog, ChainOfCustody, CaseProgress, CaseHandover


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
    officer_photo = serializers.SerializerMethodField()

    class Meta:
        model = ChainOfCustody
        fields = [
            "id", "action", "reason", "notes",
            "field_changed", "old_value", "new_value",
            "officer_username", "officer_role", "officer_branch",
            "officer_photo",
            "crime_number", "branch", "ip_address", "timestamp",
            "blockchain_tx", "blockchain_hash",
            "blockchain_block", "blockchain_url",
        ]

    def get_officer_photo(self, obj):
        if obj.officer and obj.officer.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.officer.photo.url)
            return obj.officer.photo.url
        return None


class CaseProgressSerializer(serializers.ModelSerializer):
    added_by = serializers.CharField(source="added_by.username", read_only=True)

    class Meta:
        model = CaseProgress
        fields = [
            "id", "case", "date_of_progress", "details_of_progress",
            "further_action_to_be_taken", "remarks", "reminder_date",
            "is_completed", "completed_at",
            "added_by", "created_at",
            "blockchain_tx", "blockchain_hash",
            "blockchain_block", "blockchain_url",
        ]
        read_only_fields = [
            "added_by", "created_at", "completed_at",
            "blockchain_tx", "blockchain_hash",
            "blockchain_block", "blockchain_url",
        ]


class CaseHandoverSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseHandover
        fields = [
            "id", "case", "from_officer_username", "to_officer_username",
            "reason", "timestamp", "crime_number",
            "blockchain_tx", "blockchain_hash",
            "blockchain_block", "blockchain_url",
        ]
        read_only_fields = [
            "from_officer_username", "to_officer_username",
            "crime_number", "timestamp",
            "blockchain_tx", "blockchain_hash",
            "blockchain_block", "blockchain_url",
        ]


class CaseRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ["id", "crime_number", "section_of_law", "accused_details", "branch", "current_stage"]
