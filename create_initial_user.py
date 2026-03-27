import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'coats.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_admin():
    username = 'admin'
    password = 'admin123'
    email = 'admin@example.com'
    
    if not User.objects.filter(username=username).exists():
        print(f"Creating superuser {username}...")
        User.objects.create_superuser(
            username=username,
            password=password,
            email=email,
            role='SUPERVISOR',  # Giving the superuser a role known by your app
            branch='HEADQUARTERS' # Setting a default branch
        )
        print("Superuser created successfully!")
    else:
        print(f"User {username} already exists. Skipping.")

if __name__ == '__main__':
    create_admin()
