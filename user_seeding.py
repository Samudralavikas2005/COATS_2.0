import os
import django

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

created = 0
skipped = 0

for u in USERS:
    if User.objects.filter(username=u["username"]).exists():
        print(f"Skipped (already exists): {u['username']}")
        skipped += 1
        continue
    User.objects.create_user(
        username=u["username"],
        password=u["password"],
        role=u["role"],
        branch=u["branch"],
    )
    print(f"Created: {u['username']} [{u['role']} / {u['branch']}]")
    created += 1

print(f"\nDone — {created} users created, {skipped} skipped.")

import random
from datetime import timedelta, date
from cases.models import Case

print("\nSeeding 20 random cases...")
case_officers = list(User.objects.filter(role="CASE"))
if not case_officers:
    print("No case officers found! Cannot assign cases.")
else:
    STAGES = ["UI", "PT", "HC", "SC", "CC"]
    IPCS = ["IPC 302", "IPC 307", "IPC 379", "IPC 420", "IPC 120B", "IPC 376A", "IPC 294"]
    PS_LIMITS = ["Central", "North", "South", "East", "West", "Suburban"]
    
    cases_created = 0
    start_date = date.today() - timedelta(days=365)
    
    for i in range(1, 21):
        officer = random.choice(case_officers)
        occ_date = start_date + timedelta(days=random.randint(0, 300))
        reg_date = occ_date + timedelta(days=random.randint(1, 10))
        
        crime_no = f"CR{random.randint(1000, 9999)}/{reg_date.year}"
        
        if Case.objects.filter(crime_number=crime_no).exists():
            continue
            
        Case.objects.create(
            crime_number=crime_no,
            ps_limit=f"{random.choice(PS_LIMITS)} PS",
            section_of_law=random.choice(IPCS),
            date_of_occurrence=occ_date,
            date_of_registration=reg_date,
            complainant_name=f"Complainant {i}",
            accused_details=f"Accused Name {i}, Age {random.randint(20, 50)}",
            gist_of_case=f"This is a randomly generated gist for case {crime_no}.",
            current_stage=random.choice(STAGES),
            action_to_be_taken="Complete investigation and file charge sheet." if random.choice([True, False]) else "Awaiting forensics.",
            case_holding_officer=officer,
            branch=officer.branch
        )
        cases_created += 1

    print(f"Successfully created {cases_created} random cases!")
