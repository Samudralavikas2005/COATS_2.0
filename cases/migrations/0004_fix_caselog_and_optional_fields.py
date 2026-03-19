from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0003_caselog'),
        ('accounts', '0002_alter_user_id'),
    ]

    operations = [
        # Drop old broken CaseLog
        migrations.DeleteModel(
            name='CaseLog',
        ),

        # Fix optional text fields on Case
        migrations.AlterField(
            model_name='case',
            name='complainant_name',
            field=models.CharField(max_length=200, blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='case',
            name='accused_details',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='case',
            name='gist_of_case',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='case',
            name='action_to_be_taken',
            field=models.TextField(blank=True, default=''),
        ),

        # Create new synced CaseLog
        migrations.CreateModel(
            name='CaseLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('field_changed', models.CharField(max_length=100)),
                ('old_value', models.TextField(blank=True, default='')),
                ('new_value', models.TextField(blank=True, default='')),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('crime_number', models.CharField(max_length=100, blank=True, default='')),
                ('branch', models.CharField(max_length=10, blank=True, default='')),
                ('case', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='case_logs',
                    to='cases.case',
                )),
                ('updated_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='case_logs',
                    to='accounts.user',
                )),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
    ]
