from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0004_fix_caselog_and_optional_fields'),
        ('accounts', '0002_alter_user_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChainOfCustody',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('officer_username', models.CharField(blank=True, default='', max_length=150)),
                ('officer_role',     models.CharField(blank=True, default='', max_length=15)),
                ('officer_branch',   models.CharField(blank=True, default='', max_length=10)),
                ('action', models.CharField(max_length=20, choices=[
                    ('CREATED',  'Case Created'),
                    ('VIEWED',   'Case Viewed'),
                    ('STAGE',    'Stage Changed'),
                    ('ACTION',   'Action Updated'),
                    ('ASSIGNED', 'Case Assigned'),
                    ('UPDATED',  'Case Updated'),
                ])),
                ('reason',        models.TextField(blank=True, default='')),
                ('notes',         models.TextField(blank=True, default='')),
                ('old_value',     models.TextField(blank=True, default='')),
                ('new_value',     models.TextField(blank=True, default='')),
                ('field_changed', models.CharField(blank=True, default='', max_length=100)),
                ('crime_number',  models.CharField(blank=True, default='', max_length=100)),
                ('branch',        models.CharField(blank=True, default='', max_length=10)),
                ('ip_address',    models.GenericIPAddressField(blank=True, null=True)),
                ('timestamp',     models.DateTimeField(auto_now_add=True)),
                ('case', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='custody_chain',
                    to='cases.case',
                )),
                ('officer', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='custody_entries',
                    to='accounts.user',
                )),
            ],
            options={
                'ordering': ['timestamp'],
            },
        ),
    ]
