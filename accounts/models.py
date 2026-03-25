from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('SUPERVISOR', 'Supervisory Officer'),
        ('CASE', 'Case Holding Officer'),
    )
    BRANCH_CHOICES = (
        ('HQ',  'Headquarters'),
        ('CNI', 'Chennai'),
        ('MDU', 'Madurai'),
        ('CMB', 'Coimbatore'),
    )
    role   = models.CharField(max_length=15, choices=ROLE_CHOICES)
    branch = models.CharField(max_length=10, choices=BRANCH_CHOICES)
    photo  = models.ImageField(
        upload_to='officer_photos/',
        null=True,
        blank=True
    )
    
    # ── Security questions for Geolocation MFA ──
    security_question_1 = models.CharField(max_length=255, blank=True, null=True)
    security_answer_1   = models.CharField(max_length=255, blank=True, null=True)
    security_question_2 = models.CharField(max_length=255, blank=True, null=True)
    security_answer_2   = models.CharField(max_length=255, blank=True, null=True)
    
    # ── Google OAuth MFA ──
    google_email = models.EmailField(blank=True, null=True)


class LoginAuditLog(models.Model):
    username   = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp  = models.DateTimeField(auto_now_add=True)
    success    = models.BooleanField(default=False)
    user_agent = models.TextField(blank=True, default="")

    # ── Blockchain anchor fields ───────────────────────────────────
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        status = "SUCCESS" if self.success else "FAILED"
        return f"{self.username} | {status} | {self.timestamp}"
