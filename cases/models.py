from django.db import models
from django.conf import settings
import uuid


class Case(models.Model):

    CASE_STAGE_CHOICES = (
        ('UI', 'Under Investigation'),
        ('PT', 'Pending Trial'),
        ('HC', 'Pending before High Court'),
        ('SC', 'Pending before Supreme Court'),
        ('CC', 'Case Closed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    ps_limit              = models.CharField(max_length=100)
    crime_number          = models.CharField(max_length=100)
    section_of_law        = models.CharField(max_length=200)
    date_of_occurrence    = models.DateField()
    date_of_registration  = models.DateField()
    complainant_name      = models.CharField(max_length=200, blank=True, default="")
    accused_details       = models.TextField(blank=True, default="")
    gist_of_case          = models.TextField(blank=True, default="")
    current_stage         = models.CharField(max_length=2, choices=CASE_STAGE_CHOICES, default="UI")
    action_to_be_taken    = models.TextField(blank=True, default="")
    date_of_first_updation = models.DateTimeField(auto_now_add=True)

    case_holding_officer  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cases"
    )
    branch = models.CharField(max_length=10)

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    def __str__(self):
        return self.crime_number

    def delete(self, *args, **kwargs):
        raise PermissionError("Cases cannot be deleted. Close the case instead.")


class CaseLog(models.Model):
    case          = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="case_logs")
    field_changed = models.CharField(max_length=100)
    old_value     = models.TextField(blank=True, default="")
    new_value     = models.TextField(blank=True, default="")
    updated_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="case_logs"
    )
    timestamp    = models.DateTimeField(auto_now_add=True)
    crime_number = models.CharField(max_length=100, blank=True, default="")
    branch       = models.CharField(max_length=10, blank=True, default="")

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-timestamp"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Audit logs are immutable and cannot be edited.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Audit logs cannot be deleted.")


class ChainOfCustody(models.Model):

    ACTION_CHOICES = (
        ('CREATED',  'Case Created'),
        ('VIEWED',   'Case Viewed'),
        ('STAGE',    'Stage Changed'),
        ('ACTION',   'Action Updated'),
        ('ASSIGNED', 'Case Assigned'),
        ('UPDATED',  'Case Updated'),
    )

    id = models.AutoField(primary_key=True)

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="custody_chain"
    )
    officer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="custody_entries"
    )
    officer_username = models.CharField(max_length=150, blank=True, default="")
    officer_role     = models.CharField(max_length=15,  blank=True, default="")
    officer_branch   = models.CharField(max_length=10,  blank=True, default="")

    action        = models.CharField(max_length=20, choices=ACTION_CHOICES)
    reason        = models.TextField(blank=True, default="")
    notes         = models.TextField(blank=True, default="")
    old_value     = models.TextField(blank=True, default="")
    new_value     = models.TextField(blank=True, default="")
    field_changed = models.CharField(max_length=100, blank=True, default="")
    crime_number  = models.CharField(max_length=100, blank=True, default="")
    branch        = models.CharField(max_length=10,  blank=True, default="")
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    timestamp     = models.DateTimeField(auto_now_add=True)

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["timestamp"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Chain of custody entries are immutable and cannot be edited.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Chain of custody entries cannot be deleted.")

    def __str__(self):
        return f"{self.crime_number} | {self.action} by {self.officer_username} @ {self.timestamp}"


class CaseProgress(models.Model):
    """
    Tracks investigation progress entries per case.
    Each entry is a milestone or update in the investigation.
    """
    case            = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="progress_entries")
    date_of_progress = models.DateField()
    details_of_progress = models.TextField()
    further_action_to_be_taken = models.TextField(blank=True, default="")
    remarks         = models.TextField(blank=True, default="")
    reminder_date   = models.DateField(null=True, blank=True)
    is_completed    = models.BooleanField(default=False)
    completed_at    = models.DateTimeField(null=True, blank=True)
    officer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="added_progress_entries"
    )
    created_at      = models.DateTimeField(auto_now_add=True)

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-date_of_progress"]

    def __str__(self):
        return f"{self.case.crime_number} | {self.date_of_progress} | {'Done' if self.is_completed else 'Pending'}"


class CaseHandover(models.Model):
    """
    Records every case reassignment from one officer to another.
    Authorized by a supervisor only.
    """
    case          = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="handovers")
    from_officer  = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="handovers_given"
    )
    to_officer    = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="handovers_received"
    )
    authorized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="handovers_authorized"
    )
    reason                = models.TextField()
    timestamp             = models.DateTimeField(auto_now_add=True)
    from_officer_username = models.CharField(max_length=150, blank=True, default="")
    to_officer_username   = models.CharField(max_length=150, blank=True, default="")
    crime_number          = models.CharField(max_length=100, blank=True, default="")

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-timestamp"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Handover records are immutable and cannot be edited.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Handover records cannot be deleted.")

    def __str__(self):
        return f"{self.crime_number} | {self.from_officer_username} → {self.to_officer_username}"


class Evidence(models.Model):
    """
    Digital Evidence Vault — tamper-proof file storage per case.
    Every uploaded file is SHA-256 hashed and anchored to the blockchain.
    """
    FILE_TYPE_CHOICES = (
        ('IMAGE',    'Image'),
        ('VIDEO',    'Video'),
        ('PDF',      'PDF Document'),
        ('DOCUMENT', 'Document'),
        ('AUDIO',    'Audio'),
        ('OTHER',    'Other'),
    )

    case         = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="evidence_files")
    file         = models.FileField(upload_to='evidence/%Y/%m/')
    file_name    = models.CharField(max_length=255)
    file_type    = models.CharField(max_length=15, choices=FILE_TYPE_CHOICES, default='OTHER')
    file_size    = models.IntegerField(default=0)           # bytes
    file_hash    = models.CharField(max_length=64)           # SHA-256
    description  = models.TextField(blank=True, default="")
    uploaded_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="uploaded_evidence"
    )
    uploaded_at  = models.DateTimeField(auto_now_add=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-uploaded_at"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Evidence records are immutable and cannot be edited.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Evidence files cannot be deleted.")

    def __str__(self):
        return f"{self.case.crime_number} | {self.file_name} ({self.file_hash[:12]}…)"


class Witness(models.Model):
    """
    Witness / Person of Interest management per case.
    Statements, once recorded, are immutable for court admissibility.
    """
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )
    PROTECTION_CHOICES = (
        ('NONE',      'None'),
        ('REQUESTED', 'Requested'),
        ('ACTIVE',    'Active'),
    )

    case          = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="witnesses")
    name          = models.CharField(max_length=200)
    age           = models.IntegerField(null=True, blank=True)
    gender        = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, default="")
    address       = models.TextField(blank=True, default="")
    phone         = models.CharField(max_length=20, blank=True, default="")
    relationship  = models.CharField(max_length=100, blank=True, default="")
    statement     = models.TextField(blank=True, default="")
    is_hostile    = models.BooleanField(default=False)
    is_section_164 = models.BooleanField(default=False)
    protection_status = models.CharField(
        max_length=15, choices=PROTECTION_CHOICES, default='NONE'
    )
    added_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="added_witnesses"
    )
    added_at      = models.DateTimeField(auto_now_add=True)

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-added_at"]

    def delete(self, *args, **kwargs):
        raise PermissionError("Witness records cannot be deleted.")

    def __str__(self):
        return f"{self.case.crime_number} | {self.name} ({'Hostile' if self.is_hostile else 'Cooperative'})"

