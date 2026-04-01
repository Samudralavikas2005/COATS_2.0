import os
import django

# ── Point to the PRODUCTION Neon database ─────────────────────────
os.environ['DATABASE_URL'] = (
    "postgresql://neondb_owner:npg_ab1RlCeM6hoN@ep-divine-cake-a4upeiqo-pooler"
    ".us-east-1.aws.neon.tech/neondb?sslmode=require"
)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'coats.settings')
django.setup()

from accounts.models import User

USERS = [
    # Supervisors
    {"username": "DIG_ATS",    "branch": "HQ",  "role": "SUPERVISOR", "password": "coats@DIG2024"},
    {"username": "SP_ATS_HQ",  "branch": "HQ",  "role": "SUPERVISOR", "password": "coats@SPHQ2024"},
    {"username": "SP_ATS_CNI", "branch": "CNI", "role": "SUPERVISOR", "password": "coats@SPCNI2024"},
    {"username": "SP_ATS_MDU", "branch": "MDU", "role": "SUPERVISOR", "password": "coats@SPMDU2024"},
    {"username": "SP_ATS_CMB", "branch": "CMB", "role": "SUPERVISOR", "password": "coats@SPCMB2024"},
    # HQ Officers
    {"username": "ADSP_HQ",    "branch": "HQ",  "role": "CASE", "password": "coats@ADSPHQ2024"},
    {"username": "INSADMIN",   "branch": "HQ",  "role": "CASE", "password": "coats@INSADMIN2024"},
    # Chennai Officers
    {"username": "ADSP_CNI",   "branch": "CNI", "role": "CASE", "password": "coats@ADSPCNI2024"},
    {"username": "DSP_CNI",    "branch": "CNI", "role": "CASE", "password": "coats@DSPCNI2024"},
    {"username": "INS1CNI",    "branch": "CNI", "role": "CASE", "password": "coats@INS1CNI2024"},
    {"username": "INS2CNI",    "branch": "CNI", "role": "CASE", "password": "coats@INS2CNI2024"},
    {"username": "INS3CNI",    "branch": "CNI", "role": "CASE", "password": "coats@INS3CNI2024"},
    {"username": "INS4CNI",    "branch": "CNI", "role": "CASE", "password": "coats@INS4CNI2024"},
    # Madurai Officers
    {"username": "ADSP_MDU",   "branch": "MDU", "role": "CASE", "password": "coats@ADSPMD2024"},
    {"username": "DSP_MDU",    "branch": "MDU", "role": "CASE", "password": "coats@DSPMDU2024"},
    {"username": "INS1MDU",    "branch": "MDU", "role": "CASE", "password": "coats@INS1MDU2024"},
    {"username": "INS2MDU",    "branch": "MDU", "role": "CASE", "password": "coats@INS2MDU2024"},
    {"username": "INS3MDU",    "branch": "MDU", "role": "CASE", "password": "coats@INS3MDU2024"},
    {"username": "INS4MDU",    "branch": "MDU", "role": "CASE", "password": "coats@INS4MDU2024"},
    # Coimbatore Officers
    {"username": "ADSP_CMB",   "branch": "CMB", "role": "CASE", "password": "coats@ADSPCMB2024"},
    {"username": "DSP_CMB",    "branch": "CMB", "role": "CASE", "password": "coats@DSPCMB2024"},
    {"username": "INS1CMB",    "branch": "CMB", "role": "CASE", "password": "coats@INS1CMB2024"},
    {"username": "INS2CMB",    "branch": "CMB", "role": "CASE", "password": "coats@INS2CMB2024"},
    {"username": "INS3CMB",    "branch": "CMB", "role": "CASE", "password": "coats@INS3CMB2024"},
    {"username": "INS4CMB",    "branch": "CMB", "role": "CASE", "password": "coats@INS4CMB2024"},
]

print("=" * 60)
print("  COATS 2.0 — Production User Seeding")
print("  Target: Neon PostgreSQL (Production)")
print("=" * 60)

created = 0
skipped = 0

for u in USERS:
    if User.objects.filter(username=u["username"]).exists():
        print(f"  ⏭  Skipped (exists): {u['username']}")
        skipped += 1
        continue
    User.objects.create_user(
        username=u["username"],
        password=u["password"],
        role=u["role"],
        branch=u["branch"],
    )
    print(f"  ✅ Created: {u['username']} [{u['role']} / {u['branch']}]")
    created += 1

print(f"\n{'=' * 60}")
print(f"  Done — {created} created, {skipped} skipped.")
print(f"  Total users: {User.objects.count()}")
print(f"{'=' * 60}")
